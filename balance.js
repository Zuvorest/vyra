'use strict';

const express = require('express');
const db = require('./db');
const { requireAuth } = require('./guard');

const router = express.Router();

// GET /api/balance
// Melihat saldo uang saat ini
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await db.admin
      .from('balance')
      .select('amount, currency, updated_at')
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        balance: data.amount,
        currency: data.currency,
        updated_at: data.updated_at
      },
      error: null,
      message: 'OK'
    });
  } catch (err) { next(err); }
});

// GET /api/balance/transactions
// Riwayat transaksi uang
router.get('/transactions', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const { data, error, count } = await db.admin
      .from('transactions')
      .select('id, amount, type, status, provider, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: {
        transactions: data,
        pagination: { total: count, limit, offset }
      },
      error: null,
      message: 'OK'
    });
  } catch (err) { next(err); }
});

module.exports = router;
