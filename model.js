'use strict';

const express = require('express');
const db = require('./db');

const router = express.Router();

// GET /api/models
// Melihat daftar model AI yang aktif (publik, tidak perlu login)
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await db.admin
      .from('models')
      .select('id, name, type, provider, credit_cost')
      .eq('is_active', true)
      .order('type', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: { models: data },
      error: null,
      message: 'Daftar model berhasil diambil'
    });
  } catch (err) { next(err); }
});

module.exports = router;
