'use strict';

const express = require('express');
const db = require('./db');

const router = express.Router();

// GET /api/pricing/packages — publik
router.get('/packages', async (req, res, next) => {
  try {
    const { data, error } = await db.admin
      .from('pricing_packages')
      .select('id, name, base_credits, bonus_credits, price_idr, badge, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: { packages: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

module.exports = router;