'use strict';

const express = require('express');
const { z } = require('zod');
const db = require('./db');
const { authLimiter } = require('./limit');
const { audit } = require('./log');
const {
  setAuthCookies, clearAuthCookies, requireAuth, sanitizeUser, COOKIE_RT,
} = require('./guard');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  display_name: z.string().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const { data, error } = await db.supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { display_name: body.display_name || body.email.split('@')[0] } },
    });
    if (error) {
      return res.status(400).json({ success: false, data: null, error: 'SIGNUP_FAILED', message: error.message });
    }
    if (!data.session) {
      return res.json({
        success: true,
        data: { needs_email_confirmation: true, user: sanitizeUser(data.user) },
        error: null,
        message: 'Registrasi berhasil. Cek email untuk verifikasi, lalu login.',
      });
    }
    setAuthCookies(res, data.session);
    audit({ actorId: data.user.id, action: 'register', ip: req.ip });
    res.status(201).json({ success: true, data: { user: sanitizeUser(data.user) }, error: null, message: 'Registrasi berhasil' });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { data, error } = await db.supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    if (error) {
      return res.status(401).json({ success: false, data: null, error: 'LOGIN_FAILED', message: 'Email atau password salah' });
    }
    setAuthCookies(res, data.session);
    res.json({ success: true, data: { user: sanitizeUser(data.user) }, error: null, message: 'Login berhasil' });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true, data: null, error: null, message: 'Logout berhasil' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: { user: sanitizeUser(req.user) }, error: null, message: 'OK' });
});

router.post('/refresh', async (req, res) => {
  const rt = req.cookies?.[COOKIE_RT];
  if (!rt) {
    return res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', message: 'Tidak ada sesi untuk di-refresh' });
  }
  const { data, error } = await db.supabase.auth.refreshSession({ refresh_token: rt });
  if (error || !data.session) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, data: null, error: 'REFRESH_FAILED', message: 'Sesi kedaluwarsa, silakan login ulang' });
  }
  setAuthCookies(res, data.session);
  res.json({ success: true, data: { user: sanitizeUser(data.user) }, error: null, message: 'Sesi diperbarui' });
});


// GET /api/auth/google-url
router.get('/google-url', async (req, res, next) => {
  try {
    const config = require('./config');
    const { data, error } = await db.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${config.appUrl}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    res.json({ success: true, data: { url: data.url }, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

// POST /api/auth/set-session
// Dipanggil dari /auth/callback setelah Google auth — terima access_token + refresh_token
router.post('/set-session', async (req, res, next) => {
  try {
    const { access_token, refresh_token } = req.body || {};
    if (!access_token || !refresh_token) {
      return res.status(400).json({ success: false, data: null, error: 'INVALID', message: 'Token tidak lengkap' });
    }
    const { data, error } = await db.supabase.auth.getUser(access_token);
    if (error || !data?.user) {
      return res.status(401).json({ success: false, data: null, error: 'INVALID_TOKEN', message: 'Token tidak valid' });
    }
    setAuthCookies(res, { access_token, refresh_token, expires_in: 3600 });
    audit({ actorId: data.user.id, action: 'login_google', ip: req.ip });
    res.json({ success: true, data: { user: sanitizeUser(data.user) }, error: null, message: 'Login berhasil' });
  } catch (err) { next(err); }
});
module.exports = router;
