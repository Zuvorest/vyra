'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const db = require('./db');
const { globalLimiter } = require('./limit');
const { safeLogError } = require('./log');

const authRouter = require('./auth');
const userRouter = require('./user');
const creditRouter = require('./credit');
const balanceRouter = require('./balance');
const modelRouter = require('./model');
const jobModule = require('./job');
const apiRouter = require('./api');
const paymentRouter = require('./payment');
const adminRouter = require('./admin');
const pricingRouter = require('./pricing');
const toolRouter = require('./tool');
const notifRouter = require('./notif');
const favoriteRouter = require('./favorite');
const pubsetRouter = require('./pubset');
const featureRouter = require('./feature');
const execRouter = require('./exec');
const { scan: scanAI } = require('./loader');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://esm.sh"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://esm.sh"],
      mediaSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Agar tidak memblokir CDN ESM
}));

const allowedOrigins = new Set([config.appUrl]);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    const err = new Error('Origin tidak diizinkan oleh CORS');
    err.status = 403; err.code = 'CORS_DENIED';
    return cb(err);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '30mb' }));
app.use(globalLimiter);

app.get('/api/health', async (req, res) => {
  const dbStatus = await db.ping();
  res.json({
    success: true,
    data: {
      status: 'ok',
      env: config.env,
      uptime: Math.floor(process.uptime()),
      db: { ok: dbStatus.ok, auth: dbStatus.auth, rest: dbStatus.rest },
    },
    error: null,
    message: 'VYRA backend aktif',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/credit', creditRouter);
app.use('/api/balance', balanceRouter);
app.use('/api/models', modelRouter);
app.use('/api/jobs', jobModule.router);
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/tools', toolRouter);
app.use('/api/chat', require('./chat'));
app.use('/api/audio-studio', require('./audio'));
app.use('/api/image-studio', require('./image_studio'));
app.use('/api', apiRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/settings', pubsetRouter);
app.use('/api/feature', featureRouter);
app.use('/api/exec', execRouter);
// Tambahkan di bagian routing app.js

// --- Serve frontend (React SPA) ---
const path = require('path');
app.use('/temp', express.static(path.join(__dirname, 'temp')));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback SPA (semua route non-/api → index.html)
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, data: null, error: 'API_NOT_FOUND', message: 'Endpoint tidak ditemukan' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.name === 'ZodError' && Array.isArray(err.issues)) {
    return res.status(400).json({
      success: false, data: null, error: 'VALIDATION_ERROR',
      message: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '),
    });
  }
  safeLogError(req, err);
  const status = err.status || 500;
  res.status(status).json({
    success: false, data: null,
    error: err.code || 'INTERNAL_ERROR',
    message: config.isProd ? 'Terjadi kesalahan pada server' : err.message,
  });
});

// Auto-scan ai/ folder setiap startup
scanAI().catch(err => console.error('[LOADER] startup scan error:', err.message));

module.exports = app;
