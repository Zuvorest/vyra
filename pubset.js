'use strict';
const express = require('express');
const db = require('./db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('settings')
      .select('key, value').in('key', ['contact_whatsapp', 'contact_instagram', 'payment_note']);
    if (error) throw error;
    const obj = Object.fromEntries((data || []).map(r => [r.key, r.value]));
    res.json({ success: true, data: obj, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

module.exports = router;