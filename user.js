'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { requireAuth, sanitizeUser } = require('./guard');

const router = express.Router();

// GET /api/user/me
// Mengambil data user, profil, kredit, dan saldo sekaligus
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [profileRes, creditRes, balanceRes] = await Promise.all([
      db.admin.from('profiles').select('display_name, avatar_url, status, created_at').eq('id', userId).single(),
      db.admin.from('credits').select('balance').eq('user_id', userId).single(),
      db.admin.from('balance').select('amount, currency').eq('user_id', userId).single()
    ]);

    if (profileRes.error) throw profileRes.error;

    res.json({
      success: true,
      data: {
        auth: sanitizeUser(req.user),
        profile: profileRes.data,
        credits: creditRes.data?.balance || 0,
        balance: balanceRes.data || { amount: 0, currency: 'IDR' }
      },
      error: null,
      message: 'Data user berhasil diambil'
    });
  } catch (err) { next(err); }
});

// PATCH /api/user/profile
// Memperbarui display_name dan avatar_url
const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  avatar_url: z.string().url().max(255).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "Minimal satu field harus diisi"
});

router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const updates = updateProfileSchema.parse(req.body);
    const userId = req.user.id;

    const { data, error } = await db.admin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('display_name, avatar_url, status, updated_at')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: { profile: data },
      error: null,
      message: 'Profil berhasil diperbarui'
    });
  } catch (err) { next(err); }
});

module.exports = router;
