'use strict';

const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const { requireAuth, requireApiKey } = require('./guard');
const { createJobProcess } = require('./job');
const { keyLimiter, jobLimiter } = require('./limit');
const { audit } = require('./log');

const router = express.Router();

// POST /api/keys
router.post('/keys', requireAuth, keyLimiter, async (req, res, next) => {
  try {
    const rawKey = 'zy_live_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 12);

    const { data, error } = await db.admin.from('api_keys').insert({
      user_id: req.user.id,
      name: req.body.name || 'Default Key',
      prefix,
      key_hash: keyHash,
      scopes: ['all'],
    }).select('id, name, prefix, created_at').single();

    if (error) throw error;

    audit({
      actorId: req.user.id,
      action: 'api_key_create',
      targetType: 'api_key',
      targetId: data.id,
      metadata: { name: data.name, prefix: data.prefix },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: { ...data, key: rawKey },
      error: null,
      message: 'Simpan API key ini. Anda tidak akan bisa melihatnya lagi.',
    });
  } catch (err) { next(err); }
});

// GET /api/keys
router.get('/keys', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('api_keys')
      .select('id, name, prefix, last_used_at, created_at, revoked_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: { keys: data }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// DELETE /api/keys/:id
router.delete('/keys/:id', requireAuth, keyLimiter, async (req, res, next) => {
  try {
    const { data, error } = await db.admin.from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id')
      .single();
    if (error || !data) {
      return res.status(404).json({ success: false, data: null, error: 'NOT_FOUND', message: 'Key tidak ditemukan' });
    }
    audit({ actorId: req.user.id, action: 'api_key_revoke', targetType: 'api_key', targetId: data.id, ip: req.ip });
    res.json({ success: true, data: null, error: null, message: 'API key berhasil dicabut' });
  } catch (err) { next(err); }
});

// POST /api/v1/jobs (via API Key)
router.post('/v1/jobs', requireApiKey, jobLimiter, async (req, res, next) => {
  try {
    const result = await createJobProcess(req.user.id, req.body);
    res.status(202).json({ success: true, data: result, error: null, message: 'Job diterima via API' });
  } catch (err) { next(err); }
});

module.exports = router;
