'use strict';

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { requireAuth } = require('./guard');
const { notify } = require('./log');
const { persistImageSafe } = require('./storage');

const router = express.Router();
const AI_DIR = path.join(__dirname, 'ai');

// ============================================================
// UTIL: Validasi input dari JSON schema (dynamic)
// ============================================================
function validateInput(schema, input) {
  const errors = [];
  const out = {};

  for (const field of schema || []) {
    const v = input?.[field.key];

    // Required check
    if (field.required && (v == null || v === '' || (Array.isArray(v) && v.length === 0))) {
      errors.push(`${field.label || field.key} wajib diisi`);
      continue;
    }

    if (v == null || v === '') {
      out[field.key] = field.default ?? null;
      continue;
    }

    // Type-specific validation
    switch (field.type) {
      case 'number':
      case 'slider': {
        const n = Number(v);
        if (isNaN(n)) { errors.push(`${field.label || field.key}: harus angka`); continue; }
        if (field.min != null && n < field.min) { errors.push(`${field.label || field.key}: minimal ${field.min}`); continue; }
        if (field.max != null && n > field.max) { errors.push(`${field.label || field.key}: maksimal ${field.max}`); continue; }
        out[field.key] = n;
        break;
      }
      case 'checkbox':
        out[field.key] = !!v;
        break;
      case 'images': {
        if (!Array.isArray(v)) { errors.push(`${field.label || field.key}: harus array`); continue; }
        if (field.maxItems && v.length > field.maxItems) {
          errors.push(`${field.label || field.key}: maksimal ${field.maxItems} gambar`); continue;
        }
        out[field.key] = v;
        break;
      }
      case 'image':
      case 'text':
      case 'textarea':
      case 'prompt':
      case 'select': {
        if (typeof v !== 'string') { errors.push(`${field.label || field.key}: harus teks`); continue; }
        if (field.maxLength && v.length > field.maxLength) {
          errors.push(`${field.label || field.key}: maksimal ${field.maxLength} karakter`); continue;
        }
        out[field.key] = v;
        break;
      }
      default:
        out[field.key] = v;
    }
  }

  return { errors, value: out };
}

// ============================================================
// UTIL: Cek apakah output type butuh storage persistence
// ============================================================
function needsPersist(outType) {
  return ['image', 'images', 'video', 'audio', 'files'].includes(outType);
}

// ============================================================
// POST /api/exec/:toolId
// ============================================================
router.post('/:toolId', requireAuth, async (req, res, next) => {
  const t0 = Date.now();
  try {
    const userId = req.user.id;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[EXEC] 📥 Request dari user ${userId.slice(0, 8)}...`);
    console.log(`[EXEC] Tool: ${req.params.toolId}`);

    // ===== 1. Load tool dari DB =====
    const { data: tool, error: tErr } = await db.admin
      .from('tools').select('*').eq('id', req.params.toolId).single();

    if (tErr || !tool) {
      console.log(`[EXEC] ❌ Tool tidak ditemukan: ${req.params.toolId}`);
      return res.status(404).json({
        success: false, data: null, error: 'NOT_FOUND',
        message: 'Fitur tidak ditemukan',
      });
    }

    console.log(`[EXEC] Tool loaded: ${tool.name} (${tool.category_id}/${tool.slug})`);

    // ===== 2. Cek status publikasi =====
    if (!tool.is_active || !['active', 'beta'].includes(tool.status)) {
      console.log(`[EXEC] ⚠️ Tool belum aktif — is_active=${tool.is_active}, status=${tool.status}`);
      return res.status(400).json({
        success: false, data: null, error: 'NOT_ACTIVE',
        message: 'Fitur belum dipublikasikan',
      });
    }

    if (!tool.execution_handler) {
      console.log(`[EXEC] ❌ Tool tidak punya execution_handler`);
      return res.status(400).json({
        success: false, data: null, error: 'NO_HANDLER',
        message: 'Fitur belum punya handler',
      });
    }

    // ===== 3. Validate input =====
    const { errors, value: cleanInput } = validateInput(tool.input_schema, req.body?.input || {});
    if (errors.length > 0) {
      console.log(`[EXEC] ❌ Validasi gagal: ${errors.join('; ')}`);
      return res.status(400).json({
        success: false, data: null, error: 'VALIDATION_ERROR',
        message: errors.join('; '),
      });
    }
    console.log(`[EXEC] ✓ Input valid. Keys: ${Object.keys(cleanInput).join(', ')}`);

    // ===== 4. Load handler file =====
    const handlerPath = path.join(AI_DIR, tool.execution_handler + '.js');
    if (!fs.existsSync(handlerPath)) {
      console.log(`[EXEC] ❌ Handler file tidak ada: ${handlerPath}`);
      return res.status(500).json({
        success: false, data: null, error: 'HANDLER_MISSING',
        message: 'File handler tidak ditemukan di server',
      });
    }

    delete require.cache[require.resolve(handlerPath)];
    const handlerMod = require(handlerPath);
    if (typeof handlerMod.handler !== 'function') {
      console.log(`[EXEC] ❌ Handler file tidak export function 'handler'`);
      return res.status(500).json({
        success: false, data: null, error: 'HANDLER_INVALID',
        message: 'Handler file tidak valid (butuh export.handler)',
      });
    }
    console.log(`[EXEC] ✓ Handler loaded: ${handlerPath}`);

    // ===== 5. Pricing =====
    const credits = tool.pricing?.credits ?? tool.credit_cost ?? 0;
    const isFree = tool.pricing?.is_free === true || credits === 0;
    const idemKey = req.body?.idempotency_key
      || `tool_${tool.id}_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    console.log(`[EXEC] 💰 Biaya: ${isFree ? 'GRATIS' : credits + ' credits'} | idem_key: ${idemKey.slice(0, 40)}...`);

    // ===== 6. Debit kredit (kalau berbayar) =====
    let newBalance = null;
    if (!isFree && credits > 0) {
      const { data: bal, error: debitErr } = await db.admin.rpc('credit_debit', {
        p_user_id: userId,
        p_amount: credits,
        p_reason: `feature_${tool.id}`,
        p_ref_id: idemKey,
      });

      if (debitErr) {
        console.log(`[EXEC] ❌ Debit kredit gagal: ${debitErr.message}`);
        return res.status(400).json({
          success: false, data: null, error: 'CREDIT_FAILED',
          message: debitErr.message,
        });
      }
      newBalance = bal;
      console.log(`[EXEC] 💳 Kredit terdebit. Saldo baru: ${newBalance}`);
    }

    // ===== 7. Insert job (status: processing) =====
    const { data: job, error: jErr } = await db.admin.from('jobs').insert({
      user_id: userId,
      feature_id: tool.id,
      type: (tool.output_schema?.type || 'text'),
      status: 'processing',
      input: cleanInput,
      credit_cost: isFree ? 0 : credits,
      idempotency_key: idemKey,
    }).select().single();

    if (jErr) {
      console.log(`[EXEC] ❌ Insert job gagal: ${jErr.message}`);
      // Refund karena insert job gagal
      if (!isFree && credits > 0) {
        await db.admin.rpc('credit_add', {
          p_user_id: userId, p_amount: credits,
          p_reason: 'refund_job_create_failed', p_ref_id: idemKey + '_refund',
        });
        console.log(`[EXEC] 💸 Refund ${credits} credits (insert job gagal)`);
      }
      throw jErr;
    }

    console.log(`[EXEC] 🎫 Job dibuat: ${job.id}`);
    console.log(`[EXEC] ⏱️  Response 202 dalam ${Date.now() - t0}ms`);

    // ===== 8. Return 202 ke user (langsung, tanpa tunggu handler) =====
    res.status(202).json({
      success: true,
      data: {
        job_id: job.id,
        status: 'processing',
        credits_remaining: newBalance,
        is_free: isFree,
        credits_charged: isFree ? 0 : credits,
      },
      error: null,
      message: 'Fitur sedang dijalankan',
    });

    // ===== 9. Jalankan handler di BACKGROUND =====
    setImmediate(async () => {
      const bgStart = Date.now();
      console.log(`\n[EXEC-BG] 🚀 Handler start untuk job ${job.id}`);
      console.log(`[EXEC-BG] Tool: ${tool.name} | User: ${userId.slice(0, 8)}...`);

      try {
        // Load secrets (kalau ada)
        let secrets = null;
        const { data: sec } = await db.admin
          .from('tool_secrets').select('value').eq('tool_id', tool.id).maybeSingle();
        if (sec?.value) {
          secrets = sec.value;
          console.log(`[EXEC-BG] 🔑 Secret loaded (${secrets.length} chars)`);
        }

        const ctx = {
          userId,
          tool,
          jobId: job.id,
          secrets,
          supabase: db.admin,
        };

        // Timeout 10 menit (cukup untuk scraper heavy)
        const timeoutMs = tool.integration?.timeout_ms || 600000;
        console.log(`[EXEC-BG] ⏳ Timeout: ${(timeoutMs / 1000).toFixed(0)}s`);

        // Race: handler vs timeout
        const result = await Promise.race([
          Promise.resolve(handlerMod.handler(cleanInput, ctx)),
          new Promise((_, rej) =>
            setTimeout(
              () => rej(new Error(`Timeout: handler melebihi ${(timeoutMs / 1000).toFixed(0)} detik`)),
              timeoutMs
            )
          ),
        ]);

        const handlerDuration = ((Date.now() - bgStart) / 1000).toFixed(1);
        console.log(`[EXEC-BG] ✅ Handler selesai dalam ${handlerDuration}s`);
        console.log(`[EXEC-BG] 📊 Result keys: ${result ? Object.keys(result).join(', ') : '(empty)'}`);

        // ===== 10. Auto-persist output ke Supabase Storage =====
        const outType = tool.output_schema?.type || 'text';
        if (result && needsPersist(outType)) {
          console.log(`[EXEC-BG] 📦 Persist ${outType} ke storage...`);
          const pStart = Date.now();

          if (outType === 'image' && result.url) {
            const original = result.url;
            result.url = await persistImageSafe(
              result.url,
              `${tool.category_id}/${tool.slug}`,
              userId
            );
            result.original_url = original; // simpan referensi (untuk audit)
          } else if ((outType === 'images' || outType === 'files') && Array.isArray(result.urls)) {
            const originals = [...result.urls];
            result.urls = await Promise.all(
              result.urls.map(u =>
                persistImageSafe(u, `${tool.category_id}/${tool.slug}`, userId)
              )
            );
            result.original_urls = originals;
          } else if ((outType === 'video' || outType === 'audio') && result.url) {
            const original = result.url;
            result.url = await persistImageSafe(
              result.url,
              `${tool.category_id}/${tool.slug}`,
              userId
            );
            result.original_url = original;
          }

          console.log(`[EXEC-BG] 📦 Persist selesai dalam ${((Date.now() - pStart) / 1000).toFixed(1)}s`);
        }

        // ===== 11. Update job: completed =====
        await db.admin.from('jobs').update({
          status: 'completed',
          output: result || {},
          result: result || {},
          completed_at: new Date().toISOString(),
        }).eq('id', job.id);

        const totalDuration = ((Date.now() - bgStart) / 1000).toFixed(1);
        console.log(`[EXEC-BG] ✅✅ Job ${job.id} COMPLETED. Total ${totalDuration}s`);
        console.log(`${'='.repeat(60)}\n`);

        // ===== 12. Notify user =====
        try {
          await notify({
            userId,
            type: 'job_completed',
            title: `${tool.name} selesai`,
            message: `Job berhasil dalam ${totalDuration}s.`,
            link: `/dashboard/tools/${tool.category_id}/${tool.slug}`,
            metadata: { job_id: job.id, tool_id: tool.id, duration_s: parseFloat(totalDuration) },
          });
        } catch (notifErr) {
          console.error(`[EXEC-BG] ⚠️ Notify gagal: ${notifErr.message}`);
        }

      } catch (err) {
        // ===== ERROR HANDLER =====
        const failDuration = ((Date.now() - bgStart) / 1000).toFixed(1);
        console.error(`[EXEC-BG] ❌❌ Job ${job.id} GAGAL setelah ${failDuration}s`);
        console.error(`[EXEC-BG] Error: ${err.message}`);
        if (err.stack) {
          console.error(`[EXEC-BG] Stack (first 5 lines):`);
          console.error(err.stack.split('\n').slice(0, 5).join('\n'));
        }

        // Update job: failed
        try {
          await db.admin.from('jobs').update({
            status: 'failed',
            error_message: err.message,
            completed_at: new Date().toISOString(),
          }).eq('id', job.id);
        } catch (updErr) {
          console.error(`[EXEC-BG] ⚠️ Gagal update job status: ${updErr.message}`);
        }

        // Refund kredit (kalau policy refund_on_fail !== false)
        const shouldRefund = tool.pricing?.refund_on_fail !== false;
        if (shouldRefund && !isFree && credits > 0) {
          try {
            const { data: refundedBal } = await db.admin.rpc('credit_add', {
              p_user_id: userId,
              p_amount: credits,
              p_reason: 'refund_job_failed',
              p_ref_id: idemKey + '_refund',
            });
            console.log(`[EXEC-BG] 💸 Refund ${credits} credits berhasil. Saldo: ${refundedBal}`);
          } catch (refundErr) {
            console.error(`[EXEC-BG] ⚠️ Refund gagal: ${refundErr.message}`);
          }
        } else {
          console.log(`[EXEC-BG] ℹ️ Tidak ada refund (free=${isFree}, policy=${shouldRefund})`);
        }

        // Notify user: failed
        try {
          await notify({
            userId,
            type: 'job_failed',
            title: `${tool.name} gagal`,
            message: err.message.slice(0, 200),
            link: `/dashboard/tools/${tool.category_id}/${tool.slug}`,
            metadata: { job_id: job.id, refunded: shouldRefund },
          });
        } catch (notifErr) {
          console.error(`[EXEC-BG] ⚠️ Notify gagal: ${notifErr.message}`);
        }

        console.log(`${'='.repeat(60)}\n`);
      }
    });

  } catch (err) {
    // Error sebelum response terkirim
    console.error(`[EXEC] ❌ Error sebelum response: ${err.message}`);
    next(err);
  }
});

module.exports = router;
