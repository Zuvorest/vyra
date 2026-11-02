'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { requireAuth, requireAdmin } = require('./guard');
const { audit, notify } = require('./log');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ============================================================
// GET /api/admin/stats
// ============================================================
router.get('/stats', async (req, res, next) => {
  try {
    const [
      usersRes, completedRes, pendingRes, failedRes,
      trxOkRes, trxPendingRes, creditsData, balanceData
    ] = await Promise.all([
      db.admin.from('profiles').select('id', { count: 'exact', head: true }),
      db.admin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      db.admin.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
      db.admin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      db.admin.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'success'),
      db.admin.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      db.admin.from('credits').select('balance'),
      db.admin.from('balance').select('amount'),
    ]);

    const creditsSum = (creditsData.data || []).reduce((s, r) => s + Number(r.balance || 0), 0);
    const balanceSum = (balanceData.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);

    res.json({
      success: true,
      data: {
        users: usersRes.count || 0,
        jobs: {
          completed: completedRes.count || 0,
          pending: pendingRes.count || 0,
          failed: failedRes.count || 0,
        },
        transactions: {
          success: trxOkRes.count || 0,
          pending: trxPendingRes.count || 0,
        },
        credits_in_system: creditsSum,
        balance_in_system: balanceSum,
      },
      error: null, message: 'OK',
    });
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/admin/users
// ============================================================
router.get('/users', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('profiles')
      .select('id, display_name, status, created_at, credits (balance), balance (amount)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: { users: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// ============================================================
// POST /api/admin/credits
// ============================================================
const addCreditSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().min(1),
  reason: z.string().min(3).max(100),
});

router.post('/credits', async (req, res, next) => {
  try {
    const body = addCreditSchema.parse(req.body);
    const { data: newBalance, error: creditErr } = await db.admin.rpc('credit_add', {
      p_user_id: body.user_id,
      p_amount: body.amount,
      p_reason: `admin_grant: ${body.reason}`,
      p_ref_id: `admin_${Date.now()}`,
    });
    if (creditErr) throw creditErr;

    audit({
      actorId: req.user.id, action: 'admin_add_credit',
      targetType: 'user', targetId: body.user_id,
      metadata: { amount: body.amount, reason: body.reason, new_balance: newBalance },
      ip: req.ip,
    });

    await notify({
      userId: body.user_id,
      type: 'credit_grant',
      title: 'Kredit ditambahkan',
      message: `Admin menambahkan ${body.amount} kredit. Alasan: ${body.reason}`,
      link: '/dashboard/credit',
    });

    res.json({
      success: true, data: { new_balance: newBalance },
      error: null, message: 'Kredit berhasil ditambahkan',
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /api/admin/balance  (baru — beri saldo rupiah)
// ============================================================
const addBalSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().min(1),
  reason: z.string().min(3).max(100),
});

router.post('/balance', async (req, res, next) => {
  try {
    const body = addBalSchema.parse(req.body);
    const { data: newBalance, error: balErr } = await db.admin.rpc('balance_add', {
      p_user_id: body.user_id,
      p_amount: body.amount,
      p_reason: `admin_grant_balance: ${body.reason}`,
    });
    if (balErr) throw balErr;

    audit({
      actorId: req.user.id, action: 'admin_add_balance',
      targetType: 'user', targetId: body.user_id,
      metadata: { amount: body.amount, reason: body.reason, new_balance: newBalance },
      ip: req.ip,
    });

    await notify({
      userId: body.user_id,
      type: 'balance_grant',
      title: 'Saldo ditambahkan',
      message: `Admin menambahkan Rp ${body.amount.toLocaleString('id-ID')} ke saldo Anda.`,
      link: '/dashboard/credit',
    });

    res.json({
      success: true, data: { new_balance: newBalance },
      error: null, message: 'Saldo berhasil ditambahkan',
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /api/admin/settings
// ============================================================
const settingSchema = z.object({
  key: z.enum(['contact_whatsapp', 'contact_instagram', 'payment_note']),
  value: z.string().max(2000),
});

router.post('/settings', async (req, res, next) => {
  try {
    const body = settingSchema.parse(req.body);
    const { error } = await db.admin.from('settings').upsert({
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    audit({
      actorId: req.user.id, action: 'admin_update_setting',
      targetType: 'setting', targetId: body.key,
      metadata: { value: body.value.slice(0, 100) },
      ip: req.ip,
    });

    res.json({ success: true, data: null, error: null, message: 'Setting diperbarui' });
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/admin/logs
// ============================================================
router.get('/logs', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('audit_log')
      .select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ success: true, data: { logs: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/admin/models
// ============================================================
router.get('/models', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('models')
      .select('*').order('type').order('name');
    if (error) throw error;
    res.json({ success: true, data: { models: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// ============================================================
// PATCH /api/admin/models/:id
// ============================================================
const modelUpdateSchema = z.object({
  credit_cost: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Minimal satu field harus diisi' });

router.patch('/models/:id', async (req, res, next) => {
  try {
    const body = modelUpdateSchema.parse(req.body);
    const { data, error } = await db.admin.from('models')
      .update(body).eq('id', req.params.id).select().single();
    if (error || !data) {
      return res.status(404).json({
        success: false, data: null, error: 'NOT_FOUND',
        message: 'Model tidak ditemukan',
      });
    }
    audit({
      actorId: req.user.id, action: 'admin_update_model',
      targetType: 'model', targetId: req.params.id,
      metadata: body, ip: req.ip,
    });
    res.json({ success: true, data: { model: data }, error: null, message: 'Model diperbarui' });
  } catch (err) { next(err); }
});

// ============================================================
// GET /api/admin/transactions
// ============================================================
router.get('/transactions', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { data, error } = await db.admin.from('transactions')
      .select('id, user_id, amount, type, status, provider, created_at')
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    res.json({ success: true, data: { transactions: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

module.exports = router;