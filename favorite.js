'use strict';
const express = require('express');
const db = require('./db');
const { requireAuth } = require('./guard');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('favorites')
      .select('tool_id, tools (id, name, description, category_id, type, status, credit_cost)')
      .eq('user_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: { favorites: (data || []).map(f => f.tools).filter(Boolean) }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

router.post('/:toolId', requireAuth, async (req, res, next) => {
  try {
    const { error } = await db.admin.from('favorites')
      .insert({ user_id: req.user.id, tool_id: req.params.toolId });
    if (error && error.code !== '23505') throw error;
    res.json({ success: true, data: null, error: null, message: 'Ditambahkan ke favorit' });
  } catch (err) { next(err); }
});

router.delete('/:toolId', requireAuth, async (req, res, next) => {
  try {
    await db.admin.from('favorites').delete()
      .eq('user_id', req.user.id).eq('tool_id', req.params.toolId);
    res.json({ success: true, data: null, error: null, message: 'Dihapus dari favorit' });
  } catch (err) { next(err); }
});

module.exports = router;