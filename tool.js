
'use strict';

const express = require('express');
const db = require('./db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const category = req.query.category;
    const featured = req.query.featured === 'true';
    const limit = Math.min(Number(req.query.limit) || 300, 500);
    const offset = Number(req.query.offset) || 0;

    let query = db.admin.from('tools')
      .select('id, name, slug, description, category_id, subcategory_id, type, status, credit_cost, is_featured, icon, label', { count: 'exact' })
      .in('status', ['active', 'beta'])
      .order('sort_order', { ascending: true })
      .range(offset, offset + limit - 1);

    if (category) query = query.eq('category_id', category);
    if (featured) query = query.eq('is_featured', true);

    const { data, error, count } = await query;
    if (error) throw error;

    const [catsRes, subsRes] = await Promise.all([
      db.admin.from('tool_categories')
        .select('id, name, icon, sort_order, description, thumbnail, show_on_home, is_active')
        .eq('is_active', true)
        .order('sort_order'),
      db.admin.from('tool_subcategories')
        .select('id, category_id, name, slug, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order'),
    ]);

    res.json({
      success: true,
      data: {
        tools: data || [],
        categories: catsRes.data || [],
        subcategories: subsRes.data || [],
        total: count || 0,
      },
      error: null,
      message: 'OK',
    });
  } catch (err) { next(err); }
});

module.exports = router;