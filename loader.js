
const fs = require('fs');
const path = require('path');
const db = require('./db');

const AI_DIR = path.join(__dirname, 'ai');

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Scan ai/*.js dan register ke DB (idempotent).
 * Cek existing berdasarkan ID dulu (paling reliable), lalu fallback ke
 * execution_handler + category_id.
 */
async function scan() {
  if (!fs.existsSync(AI_DIR)) {
    fs.mkdirSync(AI_DIR, { recursive: true });
    console.log('[LOADER] folder ai/ dibuat. Tambah file .js untuk fitur baru.');
    return { loaded: 0, errors: 0 };
  }

  const files = fs.readdirSync(AI_DIR)
  .filter(f => f.endsWith('.js'))
  .filter(f => !f.startsWith('_')); // skip file helper (diawali _)
  let loaded = 0, errors = 0;

  for (const file of files) {
    try {
      const modPath = path.join(AI_DIR, file);
      delete require.cache[require.resolve(modPath)];
      const mod = require(modPath);
      if (!mod || !mod.name || !mod.handler) {
        console.warn(`[LOADER] ${file} tidak punya name/handler — skip`);
        errors++;
        continue;
      }

      const slug = mod.slug || slugify(mod.name);
      const category = mod.category || 'ai';
      const inputSchema = mod.input || [];
      const outputSchema = mod.output || { type: 'text' };
      const toolId = `${category}-${slug}`;

      // 1. Cek by ID dulu (paling reliable)
      let existing = null;
      const { data: byId } = await db.admin.from('tools')
        .select('id, pricing, validation_status, is_active, execution_handler, category_id')
        .eq('id', toolId)
        .maybeSingle();
      existing = byId;

      // 2. Kalau tidak ada by ID, cek by handler+category
      if (!existing) {
        const { data: byHandler } = await db.admin.from('tools')
          .select('id, pricing, validation_status, is_active, execution_handler, category_id')
          .eq('execution_handler', slug)
          .eq('category_id', category)
          .maybeSingle();
        existing = byHandler;
      }

      if (existing) {
        // Update metadata (JANGAN sentuh pricing/status/validation yang admin atur)
        await db.admin.from('tools').update({
          name: mod.name,
          description: mod.description || null,
          long_description: mod.long_description || null,
          input_schema: inputSchema,
          output_schema: outputSchema,
          icon: mod.icon || null,
          execution_handler: slug, // pastikan handler selalu konsisten
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        loaded++;
        console.log(`[LOADER] ✓ ${file} → ${existing.id} (updated)`);
      } else {
        const draftPricing = {
          credits: mod.defaultCredits != null ? mod.defaultCredits : null,
          unit: 'per_use',
          refund_on_fail: true,
          is_free: mod.defaultCredits === 0,
        };
        const { error: insErr } = await db.admin.from('tools').insert({
          id: toolId,
          name: mod.name,
          slug,
          category_id: category,
          subcategory_id: mod.subcategory || null,
          description: mod.description || null,
          long_description: mod.long_description || null,
          type: 'ai',
          status: 'coming_soon',
          credit_cost: mod.defaultCredits || null,
          icon: mod.icon || null,
          input_schema: inputSchema,
          output_schema: outputSchema,
          pricing: draftPricing,
          examples: mod.examples || [],
          instructions: mod.instructions || null,
          error_messages: mod.error_messages || {},
          execution_handler: slug,
          validation_status: 'draft',
          is_featured: false,
          is_active: false,
          requires_login: mod.requiresLogin !== false,
          show_in_dashboard: true,
        });
        if (insErr) {
          console.error(`[LOADER] insert ${slug} gagal:`, insErr.message);
          errors++;
        } else {
          loaded++;
          console.log(`[LOADER] + ${file} → ${toolId} (draft)`);
        }
      }
    } catch (err) {
      console.error(`[LOADER] ${file} error:`, err.message);
      errors++;
    }
  }

  console.log(`[LOADER] Selesai: ${loaded} ok, ${errors} error.`);
  return { loaded, errors };
}

module.exports = { scan, slugify };
