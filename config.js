'use strict';

require('dotenv').config();

function optional(name, fallback = '') {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

function required(name) {
  const v = optional(name);
  if (!v) {
    const err = new Error(`Environment variable wajib tidak ada: ${name}`);
    err.code = 'MISSING_ENV';
    throw err;
  }
  return v;
}

const NODE_ENV = optional('NODE_ENV', 'development');
const isProd = NODE_ENV === 'production';
const PORT = Number(optional('PORT', '3000'));
const APP_URL = optional('APP_URL', `http://localhost:${PORT}`);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`PORT tidak valid: ${process.env.PORT}`);
}

const cfg = {
  env: NODE_ENV,
  isProd,
  port: PORT,
  appUrl: APP_URL,
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
};

// Validasi tambahan khusus production
if (isProd) {
  if (!cfg.supabaseServiceRoleKey) {
    console.warn('[CONFIG] PERINGATAN: SUPABASE_SERVICE_ROLE_KEY tidak di-set di production. Operasi admin/kredit tidak akan bekerja.');
  }
  if (APP_URL.startsWith('http://')) {
    console.warn('[CONFIG] PERINGATAN: APP_URL di production sebaiknya HTTPS.');
  }
}

module.exports = cfg;
