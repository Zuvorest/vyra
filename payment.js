'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { requireAuth } = require('./guard');
const { paymentLimiter, webhookLimiter } = require('./limit');
const { audit } = require('./log');

const router = express.Router();

const topupSchema = z.object({
  amount: z.number().int().min(1000).max(10000000),
});

router.post('/topup', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const { amount } = topupSchema.parse(req.body);
    const trxId = `trx_${Date.now()}_${req.user.id.slice(0, 8)}`;
    const { data, error } = await db.admin.from('transactions').insert({
      user_id: req.user.id, amount, type: 'topup', status: 'pending',
      provider: 'mock_gateway', provider_ref: trxId,
      metadata: {},
    }).select().single();
    if (error) throw error;
    res.status(201).json({
      success: true,
      data: {
        transaction_id: data.id, provider_ref: trxId, amount,
        status: data.status,
        payment_url: `https://mock-payment.vyra/pay/${trxId}`,
      },
      error: null,
      message: 'Tagihan berhasil dibuat',
    });
  } catch (err) { next(err); }
});

// POST /api/payment/purchase-package — beli paket kredit
router.post('/purchase-package', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const { package_id } = req.body;
    if (!package_id) {
      return res.status(400).json({ success: false, data: null, error: 'INVALID', message: 'package_id wajib' });
    }
    const { data: pkg, error: pkErr } = await db.admin
      .from('pricing_packages').select('*')
      .eq('id', package_id).eq('is_active', true).single();
    if (pkErr || !pkg) {
      return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Paket tidak ditemukan' });
    }

    const trxId = `pkg_${Date.now()}_${req.user.id.slice(0, 8)}`;
    const { data: trx, error } = await db.admin.from('transactions').insert({
      user_id: req.user.id,
      amount: pkg.price_idr,
      type: 'topup',
      status: 'pending',
      provider: 'mock_gateway',
      provider_ref: trxId,
      metadata: {
        package_id: pkg.id,
        base_credits: pkg.base_credits,
        bonus_credits: pkg.bonus_credits,
      },
    }).select().single();
    if (error) throw error;

    res.status(201).json({
      success: true,
      data: {
        transaction_id: trx.id, provider_ref: trxId, package: pkg,
        payment_url: `https://mock-payment.vyra/pay/${trxId}`,
      },
      error: null,
      message: 'Tagihan paket dibuat',
    });
  } catch (err) { next(err); }
});

// Webhook
router.post('/webhook', webhookLimiter, async (req, res, next) => {
  try {
    const { provider_ref, status } = req.body;
    if (status !== 'success') return res.status(200).json({ message: 'Abaikan' });
    if (!provider_ref) return res.status(400).json({ message: 'provider_ref wajib' });

    const { data: trx, error: trxErr } = await db.admin
      .from('transactions')
      .update({ status: 'success' })
      .eq('provider_ref', provider_ref)
      .eq('status', 'pending')
      .select().single();

    if (trxErr || !trx) {
      return res.status(200).json({ message: 'Transaksi tidak ditemukan atau sudah diproses' });
    }

    const meta = trx.metadata || {};
    let result = null;

    if (meta.package_id) {
      const total = (meta.base_credits || 0) + (meta.bonus_credits || 0);
      const { data: nb, error: e } = await db.admin.rpc('credit_add', {
        p_user_id: trx.user_id, p_amount: total,
        p_reason: `package:${meta.package_id}`, p_ref_id: provider_ref,
      });
      if (e) throw e;
      result = { type: 'credits', amount: total, new_balance: nb };
    } else {
      const { data: nb, error: e } = await db.admin.rpc('balance_add', {
        p_user_id: trx.user_id, p_amount: trx.amount, p_reason: 'topup_success',
      });
      if (e) throw e;
      result = { type: 'balance', amount: trx.amount, new_balance: nb };
    }

    audit({
      actorId: trx.user_id, action: 'payment_success',
      targetType: 'transaction', targetId: trx.id,
      metadata: { provider_ref, ...result }, ip: req.ip,
    });

    res.status(200).json({
      success: true, data: { user_id: trx.user_id, ...result },
      message: 'Pembayaran diverifikasi',
    });
  } catch (err) { next(err); }
});

module.exports = router;