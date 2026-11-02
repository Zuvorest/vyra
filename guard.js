'use strict';

const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

const COOKIE_AT = 'vyra_at';
const COOKIE_RT = 'vyra_rt';
const RT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function cookieBase() {
  return { httpOnly: true, secure: config.isProd, sameSite: 'lax', path: '/' };
}

function setAuthCookies(res, session) {
  const base = cookieBase();
  res.cookie(COOKIE_AT, session.access_token, { ...base, maxAge: (session.expires_in || 3600) * 1000 });
  res.cookie(COOKIE_RT, session.refresh_token, { ...base, maxAge: RT_MAX_AGE });
}

function clearAuthCookies(res) {
  res.clearCookie(COOKIE_AT, { path: '/' });
  res.clearCookie(COOKIE_RT, { path: '/' });
}

async function resolveUser(req, res) {
  const at = req.cookies?.[COOKIE_AT];
  const rt = req.cookies?.[COOKIE_RT];

  if (at) {
    const { data, error } = await db.supabase.auth.getUser(at);
    if (!error && data?.user) return { user: data.user, accessToken: at };
  }

  if (rt) {
    const { data, error } = await db.supabase.auth.refreshSession({ refresh_token: rt });
    if (!error && data?.session && data?.user) {
      setAuthCookies(res, data.session);
      return { user: data.user, accessToken: data.session.access_token, refreshedSession: data.session };
    }
    clearAuthCookies(res);
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const result = await resolveUser(req, res);
    if (!result) {
      return res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', message: 'Login diperlukan' });
    }
    req.user = result.user;
    req.accessToken = result.accessToken;
    next();
  } catch (err) { next(err); }
}

async function optionalAuth(req, res, next) {
  try {
    const result = await resolveUser(req, res);
    if (result) { req.user = result.user; req.accessToken = result.accessToken; }
    next();
  } catch (err) { next(err); }
}

function requireAdmin(req, res, next) {
  const role = req.user?.app_metadata?.app_role || req.user?.user_metadata?.app_role;
  if (role !== 'admin') {
    return res.status(403).json({ success: false, data: null, error: 'FORBIDDEN', message: 'Akses admin diperlukan' });
  }
  next();
}

// Middleware baru: Otentikasi via API Key (Bearer Token)
async function requireApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', message: 'API key diperlukan' });
    }
    
    const rawKey = authHeader.split(' ')[1];
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { data: key, error } = await db.admin
      .from('api_keys')
      .select('id, user_id, revoked_at, scopes')
      .eq('key_hash', keyHash)
      .single();

    if (error || !key) {
      return res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', message: 'API key tidak valid' });
    }
    if (key.revoked_at) {
      return res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', message: 'API key sudah dicabut' });
    }

    // Update last_used_at (tanpa await agar tidak memperlambat response)
    db.admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id).then();

    // Ambil data user pemilik key
    const { data: userData, error: userErr } = await db.admin.auth.admin.getUserById(key.user_id);
    if (userErr || !userData?.user) {
      return res.status(401).json({ success: false, data: null, error: 'UNAUTHORIZED', message: 'Pemilik API key tidak ditemukan' });
    }

    req.user = userData.user;
    req.apiKey = key;
    next();
  } catch (err) { next(err); }
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    role: u.app_metadata?.app_role || u.user_metadata?.app_role || 'user',
    created_at: u.created_at,
    email_confirmed_at: u.email_confirmed_at || null,
    user_metadata: { display_name: u.user_metadata?.display_name || null },
  };
}

module.exports = {
  COOKIE_AT, COOKIE_RT, setAuthCookies, clearAuthCookies,
  requireAuth, optionalAuth, requireAdmin, requireApiKey, sanitizeUser,
};
