'use strict';
const express = require('express');
const db = require('./db');
const { requireAuth } = require('./guard');
const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const { data, error } = await db.admin.from('notifications')
      .select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    res.json({ success: true, data: { notifications: data || [] }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const { count, error } = await db.admin.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id).is('read_at', null);
    if (error) throw error;
    res.json({ success: true, data: { count: count || 0 }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await db.admin.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ success: true, data: null, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await db.admin.from('notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id).is('read_at', null);
    res.json({ success: true, data: null, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

module.exports = router;