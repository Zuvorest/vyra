'use strict';

const db = require('./db');

/**
 * Catat tindakan sensitif ke tabel audit_log.
 * Kegagalan log tidak boleh menggagalkan request utama.
 */
async function audit({ actorId, action, targetType, targetId, metadata, ip }) {
  try {
    await db.admin.from('audit_log').insert({
      actor_id: actorId || null,
      action,
      target_type: targetType || null,
      target_id: targetId ? String(targetId) : null,
      metadata: metadata || {},
      ip_address: ip || null,
    });
  } catch (err) {
    console.error('[AUDIT] Gagal mencatat log:', err.message);
  }
}

/**
 * Log error ke stdout TANPA membocorkan password/token/cookie.
 */
function safeLogError(req, err) {
  const safe = {};
  if (req.body && typeof req.body === 'object') {
    for (const k of Object.keys(req.body)) {
      if (/pass|token|secret|key|cookie|authorization/i.test(k)) continue;
      safe[k] = req.body[k];
    }
  }
  console.error('[ERROR]', {
    method: req.method,
    path: req.originalUrl,
    status: err.status || 500,
    code: err.code,
    message: err.message,
    user: req.user?.id,
    ip: req.ip,
    body: Object.keys(safe).length ? safe : undefined,
  });
}

async function notify({ userId, type, title, message, link, metadata }) {
  try {
    await db.admin.from('notifications').insert({
      user_id: userId, type, title,
      message: message || null, link: link || null,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('[NOTIF] Gagal:', err.message);
  }
}

module.exports = { audit, safeLogError, notify };
