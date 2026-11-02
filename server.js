'use strict';

const config = require('./config');
const app = require('./app');

const server = app.listen(config.port, () => {
  console.log(`[VYRA] Server jalan di http://localhost:${config.port}`);
  console.log(`[VYRA] NODE_ENV = ${config.env}`);
});

function shutdown(signal) {
  console.log(`[VYRA] Menerima ${signal}, menutup server...`);
  server.close(() => {
    console.log('[VYRA] Server ditutup.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[VYRA] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[VYRA] uncaughtException:', err);
  shutdown('uncaughtException');
});
