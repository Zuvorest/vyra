'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { requireAuth } = require('./guard');
const { jobLimiter } = require('./limit');
const { notify } = require('./log');

const router = express.Router();

const createJobSchema = z.object({
  model_id: z.string().min(1),
  input: z.record(z.any()).refine(data => Object.keys(data).length > 0, {
    message: "Input tidak boleh kosong"
  }),
  idempotency_key: z.string().optional()
});

// ============================================================
// Core: proses pembuatan job (dipakai POST / dan POST /api/v1/jobs)
// ============================================================
async function createJobProcess(userId, rawBody) {
  const body = createJobSchema.parse(rawBody);

  // 1. Cek model
  const { data: model, error: modelErr } = await db.admin
    .from('models').select('*').eq('id', body.model_id).eq('is_active', true).single();

  if (modelErr || !model) {
    const e = new Error('Model tidak tersedia atau tidak aktif');
    e.status = 404; e.code = 'MODEL_NOT_FOUND';
    throw e;
  }

  // 2. Ref ID unik (idempotency)
  const refId = body.idempotency_key || `job_${Date.now()}_${userId}`;

  // 3. Debit kredit atomik
  const { data: newBalance, error: debitErr } = await db.admin.rpc('credit_debit', {
    p_user_id: userId,
    p_amount: model.credit_cost,
    p_reason: `job_${model.id}`,
    p_ref_id: refId,
  });

  if (debitErr) {
    const e = new Error(debitErr.message);
    e.status = 400; e.code = 'CREDIT_FAILED';
    throw e;
  }

  // 4. Buat row job
  const { data: job, error: jobErr } = await db.admin.from('jobs').insert({
    user_id: userId,
    model_id: model.id,
    type: model.type,
    input: body.input,
    credit_cost: model.credit_cost,
    idempotency_key: refId,
    status: 'processing',
  }).select().single();

  if (jobErr) {
    // refund kalau gagal insert
    await db.admin.rpc('credit_add', {
      p_user_id: userId, p_amount: model.credit_cost,
      p_reason: 'refund_job_failed', p_ref_id: refId + '_refund',
    });
    throw jobErr;
  }

  // 5. Proses AI (mock async)
  setTimeout(async () => {
    const isMock = !process.env.AI_PROVIDER_API_KEY;
    const output = isMock
      ? { message: `[SIMULASI] Ini adalah hasil AI palsu dari ${model.name} untuk input: ${JSON.stringify(body.input)}` }
      : { message: `[REAL PROVIDER] Panggilan API sesungguhnya belum diimplementasikan.` };

    await db.admin.from('jobs').update({
      status: 'completed',
      output: output,
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    // Notifikasi ke user
    await notify({
      userId: userId,
      type: 'job_completed',
      title: `Job ${model.name} selesai`,
      message: `Job ${model.type} selesai. Biaya: ${model.credit_cost} kredit.`,
      link: '/dashboard/usage',
      metadata: { job_id: job.id, model_id: model.id, credit_cost: model.credit_cost },
    });
  }, 2000);

  return {
    job_id: job.id,
    status: job.status,
    credits_remaining: newBalance,
  };
}

// ============================================================
// GET /api/jobs  (list — HARUS di atas /:id agar tidak bentrok)
// ============================================================
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const { data, error, count } = await db.admin.from('jobs')
      .select('id, model_id, type, status, credit_cost, created_at, completed_at, input, output', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({
      success: true,
      data: { jobs: data || [], total: count || 0, limit, offset },
      error: null,
      message: 'OK',
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /api/jobs  (via cookie)
// ============================================================
router.post('/', requireAuth, jobLimiter, async (req, res, next) => {
  try {
    const result = await createJobProcess(req.user.id, req.body);
    res.status(202).json({
      success: true,
      data: result,
      error: null,
      message: 'Job diterima dan sedang diproses',
    });
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/jobs/:id
// ============================================================
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: job, error } = await db.admin.from('jobs')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    if (error || !job) {
      return res.status(404).json({
        success: false, data: null, error: 'NOT_FOUND',
        message: 'Job tidak ditemukan',
      });
    }
    res.json({ success: true, data: { job }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

module.exports = { router, createJobProcess };