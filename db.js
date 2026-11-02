'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let admin = null;
if (config.supabaseServiceRoleKey) {
  admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Ping Supabase tanpa menyentuh endpoint root /rest/v1/ dengan anon key.
 *
 * Sejak 2026 Supabase mewajibkan secret key (service_role) untuk endpoint
 * root /rest/v1/ (OpenAPI spec). Anon key akan ditolak dengan
 * UNAUTHORIZED_INVALID_API_KEY_TYPE.
 *
 * Strategi:
 *  - anon   -> GET /auth/v1/settings   (publik, membuktikan project + anon valid)
 *  - service-> GET /rest/v1/           (membuktikan REST API + service_role valid)
 */
async function ping() {
  const out = {
    auth: { ok: false, status: 0 },
    rest: { ok: false, status: 0 },
    ok: false,
  };

  // 1) Auth settings pakai anon key (publik)
  try {
    const res = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });
    out.auth = { ok: res.ok, status: res.status };
    if (res.ok) out.ok = true;
  } catch (err) {
    out.auth = { ok: false, status: 0, message: err.message };
  }

  // 2) REST root pakai service_role (hanya jika tersedia)
  if (admin) {
    try {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: config.supabaseServiceRoleKey,
          Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        },
      });
      out.rest = { ok: res.ok, status: res.status };
      if (res.ok) out.ok = true;
    } catch (err) {
      out.rest = { ok: false, status: 0, message: err.message };
    }
  }

  return out;
}

module.exports = { supabase, admin, ping };
