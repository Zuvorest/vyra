'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { requireAuth } = require('./guard');
const { paymentLimiter } = require('./limit');
const { audit } = require('./log');

const router = express.Router();

const getRate = () => parseInt(process.env.CREDIT_RATE || '100', 10);

// GET /api/credit — saldo kredit saat ini
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await db.admin
      .from('credits').select('balance, updated_at').eq('user_id', req.user.id).single();
    if (error) throw error;
    res.json({
      success: true,
      data: { credits: data.balance, updated_at: data.updated_at },
      error: null, message: 'OK'
    });
  } catch (err) { next(err); }
});

// GET /api/credit/info — info rate konversi
router.get('/info', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: { rate: getRate(), currency: 'IDR' },
    error: null, message: 'OK'
  });
});

// GET /api/credit/history — riwayat kredit
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const { data, error, count } = await db.admin
      .from('credit_history')
      .select('id, amount, reason, ref_id, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json({
      success: true,
      data: { history: data, pagination: { total: count, limit, offset } },
      error: null, message: 'OK'
    });
  } catch (err) { next(err); }
});

// POST /api/credit/convert — konversi saldo -> kredit
const convertSchema = z.object({
  credits: z.number().int().min(1).max(1000000),
});

router.post('/convert', requireAuth, paymentLimiter, async (req, res, next) => {
  try {
    const { credits } = convertSchema.parse(req.body);
    const rate = getRate();
    const cost = credits * rate;
    const refId = `convert_${Date.now()}_${req.user.id.slice(0, 8)}`;

    const { data, error } = await db.admin.rpc('convert_balance_to_credit', {
      p_user_id: req.user.id,
      p_credits: credits,
      p_cost: cost,
      p_ref_id: refId,
    });

    if (error) {
      const e = new Error(error.message);
      e.status = 400;
      e.code = 'CONVERT_FAILED';
      throw e;
    }

    const result = Array.isArray(data) ? data[0] : data;

    audit({
      actorId: req.user.id,
      action: 'convert_balance_to_credit',
      targetType: 'user',
      targetId: req.user.id,
      metadata: { credits_added: credits, cost, rate, ref_id: refId },
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        credits_added: credits,
        cost,
        rate,
        new_balance: Number(result.new_balance),
        new_credits: Number(result.new_credits),
      },
      error: null,
      message: `Berhasil menukar Rp ${cost.toLocaleString('id-ID')} menjadi ${credits} kredit`,
    });
  } catch (err) { next(err); }
});

module.exports = router;