'use strict';
const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { requireAuth, requireAdmin } = require('./guard');
const { audit } = require('./log');
const { scan } = require('./loader');

const router = express.Router();

// ============================================================
// PUBLIC — baca detail tool by category + slug
// ============================================================
router.get('/public/:category/:slug', async (req, res, next) => {
  try {
    const { data: tool, error } = await db.admin.from('tools')
      .select('id, name, slug, category_id, subcategory_id, description, long_description, cover_image, icon, type, status, credit_cost, input_schema, output_schema, pricing, examples, instructions, error_messages, validation_status, requires_login, label')
      .eq('category_id', req.params.category).eq('slug', req.params.slug)
      .in('status', ['active', 'beta']).maybeSingle();
    if (error || !tool) {
      return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Fitur tidak ditemukan' });
    }
    res.json({ success: true, data: { tool }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// ============================================================
// ADMIN — semua endpoint di bawah ini butuh admin
// ============================================================
router.use(requireAuth, requireAdmin);

// GET /api/feature/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [catRes, subRes, toolsRes, activeRes, draftRes, pendingApiRes] = await Promise.all([
      db.admin.from('tool_categories').select('id', { count: 'exact', head: true }),
      db.admin.from('tool_subcategories').select('id', { count: 'exact', head: true }),
      db.admin.from('tools').select('id', { count: 'exact', head: true }),
      db.admin.from('tools').select('id', { count: 'exact', head: true }).in('status', ['active', 'beta']),
      db.admin.from('tools').select('id', { count: 'exact', head: true }).eq('validation_status', 'draft'),
      db.admin.from('tools').select('id', { count: 'exact', head: true }).in('validation_status', ['pending', 'error']),
    ]);
    res.json({ success: true, data: {
      categories: catRes.count || 0,
      subcategories: subRes.count || 0,
      features: toolsRes.count || 0,
      active: activeRes.count || 0,
      drafts: draftRes.count || 0,
      pending_api: pendingApiRes.count || 0,
    }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// POST /api/feature/rescan — re-scan folder ai/
router.post('/rescan', async (req, res, next) => {
  try {
    const result = await scan();
    res.json({ success: true, data: result, error: null, message: `Scan selesai: ${result.loaded} ok, ${result.errors} error` });
  } catch (err) { next(err); }
});

// GET /api/feature/categories
router.get('/categories', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('tool_categories').select('*').order('sort_order');
    if (error) throw error;
    res.json({ success: true, data: { categories: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// POST /api/feature/categories
const catSchema = z.object({
  id: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  thumbnail: z.string().max(500).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  show_on_home: z.boolean().optional(),
});

router.post('/categories', async (req, res, next) => {
  try {
    const body = catSchema.parse(req.body);
    const id = body.id || body.slug || require('../loader').slugify(body.name);
    const { data, error } = await db.admin.from('tool_categories').upsert({
      id, name: body.name, description: body.description || null,
      icon: body.icon || null, thumbnail: body.thumbnail || null,
      sort_order: body.sort_order ?? 99, is_active: body.is_active ?? true,
      show_on_home: body.show_on_home ?? true,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    audit({ actorId: req.user.id, action: 'feature_category_upsert', targetType: 'category', targetId: id, ip: req.ip });
    res.json({ success: true, data: { category: data }, error: null, message: 'Kategori disimpan' });
  } catch (err) { next(err); }
});

// GET /api/feature/subcategories
router.get('/subcategories', async (req, res, next) => {
  try {
    let q = db.admin.from('tool_subcategories').select('*').order('sort_order');
    if (req.query.category) q = q.eq('category_id', req.query.category);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: { subcategories: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// POST /api/feature/subcategories
const subSchema = z.object({
  category_id: z.string().min(1),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

router.post('/subcategories', async (req, res, next) => {
  try {
    const body = subSchema.parse(req.body);
    const id = `${body.category_id}__${body.slug}`;
    const { data, error } = await db.admin.from('tool_subcategories').upsert({
      id, category_id: body.category_id, name: body.name, slug: body.slug,
      description: body.description || null, sort_order: body.sort_order ?? 99,
      is_active: body.is_active ?? true,
    }).select().single();
    if (error) throw error;
    res.json({ success: true, data: { subcategory: data }, error: null, message: 'Subkategori disimpan' });
  } catch (err) { next(err); }
});

// GET /api/feature/tools — list semua untuk admin
router.get('/tools', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    let q = db.admin.from('tools')
      .select('id, name, slug, category_id, subcategory_id, status, validation_status, credit_cost, type, is_featured, is_active, execution_handler, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (req.query.category) q = q.eq('category_id', req.query.category);
    if (req.query.status) q = q.eq('validation_status', req.query.status);
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ success: true, data: { tools: data, total: count, limit, offset }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// GET /api/feature/tools/:id — full detail
router.get('/tools/:id', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('tools').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Tool tidak ada' });
    res.json({ success: true, data: { tool: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// POST /api/feature/tools/:id — update
const toolUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  category_id: z.string().nullish(),
  subcategory_id: z.string().nullable().optional(),
  description: z.string().max(500).optional(),
  long_description: z.string().max(5000).nullish().transform(v => v ?? ""),
  cover_image: z.string().max(1000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  label: z.string().max(20).nullable().optional(),
  input_schema: z.array(z.any()).optional(),
  output_schema: z.object({ type: z.string() }).passthrough().optional(),
  pricing: z.object({
    credits: z.number().int().min(0).nullable().optional(),
    unit: z.string().optional(),
    refund_on_fail: z.boolean().optional(),
    is_free: z.boolean().optional(),
  }).optional(),
  integration: z.object({}).passthrough().optional(),
  examples: z.array(z.any()).optional(),
  instructions: z.string().max(5000).nullable().optional(),
  error_messages: z.object({}).passthrough().optional(),
  validation_status: z.enum(['draft','pending','ready','error','published']).optional(),
  requires_login: z.boolean().optional(),
  show_in_dashboard: z.boolean().optional(),
  status: z.enum(['active','coming_soon','beta','disabled']).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  credit_cost: z.number().int().min(0).nullable().optional(),
});

router.post('/tools/:id', async (req, res, next) => {
  try {
    const body = toolUpdateSchema.parse(req.body);
    const { data, error } = await db.admin.from('tools')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    audit({ actorId: req.user.id, action: 'feature_update', targetType: 'tool', targetId: req.params.id, metadata: body, ip: req.ip });
    res.json({ success: true, data: { tool: data }, error: null, message: 'Tool diperbarui' });
  } catch (err) { next(err); }
});

// POST /api/feature/tools/:id/publish
router.post('/tools/:id/publish', async (req, res, next) => {
  try {
    const { data: tool } = await db.admin.from('tools').select('*').eq('id', req.params.id).single();
    if (!tool) return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Tool tidak ada' });
    if (!tool.slug || !tool.category_id) {
      return res.status(400).json({ success: false, data: null, error: 'INVALID', message: 'slug dan kategori wajib diisi' });
    }
    if (!tool.execution_handler) {
      return res.status(400).json({ success: false, data: null, error: 'NO_HANDLER', message: 'Tool tidak punya execution handler' });
    }
    const { data, error } = await db.admin.from('tools')
      .update({ validation_status: 'published', status: 'active', is_active: true })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data: { tool: data }, error: null, message: 'Fitur dipublikasikan' });
  } catch (err) { next(err); }
});

// POST /api/feature/tools/:id/unpublish
router.post('/tools/:id/unpublish', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('tools')
      .update({ validation_status: 'draft', status: 'disabled', is_active: false })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data: { tool: data }, error: null, message: 'Fitur di-unpublish' });
  } catch (err) { next(err); }
});

// POST /api/feature/tools/:id/duplicate
router.post('/tools/:id/duplicate', async (req, res, next) => {
  try {
    const { data: src } = await db.admin.from('tools').select('*').eq('id', req.params.id).single();
    if (!src) return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Tool tidak ada' });
    const newSlug = src.slug + '-' + Date.now().toString(36).slice(-4);
    const newId = src.category_id + '-' + newSlug;
    const { data, error } = await db.admin.from('tools').insert({
      ...src,
      id: newId, slug: newSlug,
      name: src.name + ' (copy)',
      validation_status: 'draft', status: 'coming_soon', is_active: false,
      execution_handler: src.execution_handler, // same handler
      created_at: undefined, updated_at: undefined,
    }).select().single();
    if (error) throw error;
    res.json({ success: true, data: { tool: data }, error: null, message: 'Duplikat dibuat (draft)' });
  } catch (err) { next(err); }
});

// DELETE /api/feature/tools/:id
router.delete('/tools/:id', async (req, res, next) => {
  try {
    await db.admin.from('tools').update({ is_active: false, status: 'disabled' }).eq('id', req.params.id);
    res.json({ success: true, data: null, error: null, message: 'Tool di-soft-delete' });
  } catch (err) { next(err); }
});

// DELETE /api/feature/tools/:id/hard — hapus permanen dari DB
router.delete('/tools/:id/hard', async (req, res, next) => {
  try {
    const { count: jobCount } = await db.admin.from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('feature_id', req.params.id);

    if (jobCount && jobCount > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        success: false, data: null, error: 'HAS_JOBS',
        message: `${jobCount} job memakai fitur ini. Tambahkan ?force=true untuk hapus paksa (job kehilangan referensi).`,
      });
    }

    const { error } = await db.admin.from('tools').delete().eq('id', req.params.id);
    if (error) throw error;

    audit({
      actorId: req.user.id, action: 'feature_hard_delete',
      targetType: 'tool', targetId: req.params.id,
      metadata: { job_count: jobCount || 0, forced: req.query.force === 'true' },
      ip: req.ip,
    });

    res.json({ success: true, data: null, error: null, message: 'Tool dihapus permanen' });
  } catch (err) { next(err); }
});

// POST /api/feature/tools/:id/secret — set API secret (write-only)
router.post('/tools/:id/secret', async (req, res, next) => {
  try {
    const { value } = req.body;
    if (typeof value !== 'string' || value.length < 1) {
      return res.status(400).json({ success: false, data: null, error: 'INVALID', message: 'value wajib' });
    }
    await db.admin.from('tool_secrets').upsert({ tool_id: req.params.id, value, updated_at: new Date().toISOString() });
    audit({ actorId: req.user.id, action: 'feature_secret_set', targetType: 'tool', targetId: req.params.id, ip: req.ip });
    res.json({ success: true, data: null, error: null, message: 'Secret disimpan (tidak akan tampil lagi)' });
  } catch (err) { next(err); }
});

// POST /api/feature/tools/:id/validate — cek konfigurasi
router.post('/tools/:id/validate', async (req, res, next) => {
  try {
    const { data: tool } = await db.admin.from('tools').select('*').eq('id', req.params.id).single();
    if (!tool) return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Tool tidak ada' });
    const errors = [];
    if (!tool.slug) errors.push('slug kosong');
    if (!tool.category_id) errors.push('kategori kosong');
    if (!tool.execution_handler) errors.push('execution handler kosong');
    if (Array.isArray(tool.input_schema) && tool.input_schema.length > 0) {
      tool.input_schema.forEach((f, i) => {
        if (!f.key) errors.push(`field[${i}]: key kosong`);
        if (!f.type) errors.push(`field[${i}]: type kosong`);
        if (!f.label) errors.push(`field[${i}]: label kosong`);
      });
    }
    if (!tool.output_schema || !tool.output_schema.type) errors.push('output type kosong');
    const credits = tool.pricing?.credits ?? tool.credit_cost;
    if (credits == null) errors.push('pricing.credits kosong');
    const result = errors.length === 0 ? 'ready' : 'error';
    await db.admin.from('tools').update({ validation_status: result }).eq('id', tool.id);
    res.json({ success: errors.length === 0, data: { errors, result }, error: errors.length ? 'VALIDATION_FAILED' : null, message: errors.length ? 'Ada masalah konfigurasi' : 'Konfigurasi valid' });
  } catch (err) { next(err); }
});

// DELETE /api/feature/subcategories/:id
router.delete('/subcategories/:id', async (req, res, next) => {
  try {
    const { count } = await db.admin.from('tools')
      .select('id', { count: 'exact', head: true })
      .eq('subcategory_id', req.params.id);
    if (count && count > 0) {
      return res.status(400).json({
        success: false, data: null, error: 'IN_USE',
        message: `${count} fitur masih memakai sub-kategori ini. Pindahkan dulu sebelum hapus.`,
      });
    }
    await db.admin.from('tool_subcategories').delete().eq('id', req.params.id);
    audit({ actorId: req.user.id, action: 'subcat_delete', targetType: 'subcategory', targetId: req.params.id, ip: req.ip });
    res.json({ success: true, data: null, error: null, message: 'Sub-kategori dihapus' });
  } catch (err) { next(err); }
});

// DELETE /api/feature/categories/:id
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { count } = await db.admin.from('tools')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', req.params.id);
    if (count && count > 0) {
      return res.status(400).json({
        success: false, data: null, error: 'IN_USE',
        message: `${count} fitur masih memakai kategori ini. Pindahkan atau hapus fiturnya dulu.`,
      });
    }
    await db.admin.from('tool_categories').delete().eq('id', req.params.id);
    audit({ actorId: req.user.id, action: 'category_delete', targetType: 'category', targetId: req.params.id, ip: req.ip });
    res.json({ success: true, data: null, error: null, message: 'Kategori dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;