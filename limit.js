
'use strict';

const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, msg) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: 'TOO_MANY_REQUESTS', message: msg || 'Terlalu banyak permintaan, coba lagi nanti.' }
});

const globalLimiter = createLimiter(60 * 1000, 500);
const authLimiter = createLimiter(15 * 60 * 1000, 20, 'Terlalu banyak percobaan login, coba lagi nanti.');
const paymentLimiter = createLimiter(60 * 1000, 30, 'Terlalu banyak permintaan transaksi, coba lagi nanti.');
const jobLimiter = createLimiter(60 * 1000, 20, 'Terlalu banyak permintaan generate, coba lagi nanti.');
const keyLimiter = createLimiter(60 * 1000, 60, 'Terlalu banyak permintaan API Key.');

const baseLimits = {
  globalLimiter,
  authLimiter,
  loginLimiter: authLimiter,
  registerLimiter: authLimiter,
  paymentLimiter,
  topupLimiter: paymentLimiter,
  webhookLimiter: paymentLimiter,
  jobLimiter,
  keyLimiter,
  apiKeyLimiter: keyLimiter,
  apiLimiter: keyLimiter
};

// PROXY FAIL-SAFE: Jika ada file yang minta limiter tapi namanya tidak ada di atas,
// otomatis akan mengembalikan fungsi "next()" agar server tidak crash.
module.exports = new Proxy(baseLimits, {
  get: (target, prop) => {
    if (prop in target) return target[prop];
    if (prop === 'default') return target;
    return (req, res, next) => next(); 
  }
});
