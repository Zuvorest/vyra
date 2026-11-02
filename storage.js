'use strict';

const db = require('./db');
const crypto = require('crypto');

/**
 * Download gambar dari URL sementara → upload ke Supabase Storage → return public URL permanen.
 *
 * @param {string} sourceUrl - URL sementara (bisa expired)
 * @param {string} folder    - subfolder (misal 'ghibli/2026-10-30')
 * @param {string} userId    - ID user (untuk penamaan file)
 * @returns {Promise<string>} URL permanen dari Supabase Storage
 */
async function persistImage(sourceUrl, folder = 'outputs', userId = 'anon') {
  const bucket = 'vyra-outputs';
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  const ext = sourceUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)?.[1] || 'jpg';
  const filePath = `${folder}/${userId}_${ts}_${rand}.${ext}`;

  // 1. Download dari URL sumber (dengan Referer yang tepat)
  const referers = {
    'domoai': 'https://www.domoai.app/',
    'myqcloud': 'https://www.domoai.app/',
    'lightpdf': 'https://lightpdf.com/',
    'aoscdn': 'https://lightpdf.com/',
  };
  let referer = 'https://www.domoai.app/';
  for (const [key, val] of Object.entries(referers)) {
    if (sourceUrl.includes(key)) { referer = val; break; }
  }

  const res = await fetch(sourceUrl, {
    headers: {
      'Referer': referer,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
      'Accept': 'image/*,*/*',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Download gagal (${res.status}) — URL mungkin sudah expired`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';

  // 2. Upload ke Supabase Storage
  const { error: upErr } = await db.admin.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: contentType,
      cacheControl: '31536000', // 1 tahun
      upsert: false,
    });

  if (upErr) {
    throw new Error(`Upload ke storage gagal: ${upErr.message}`);
  }

  // 3. Return public URL permanen
  const { data: pub } = db.admin.storage.from(bucket).getPublicUrl(filePath);
  return pub.publicUrl;
}

/**
 * Versi aman: kalau upload gagal, kembalikan URL asli (fallback).
 */
async function persistImageSafe(sourceUrl, folder, userId) {
  try {
    const permanent = await persistImage(sourceUrl, folder, userId);
    console.log(`[STORAGE] ✓ Persisted: ${permanent.slice(0, 80)}...`);
    return permanent;
  } catch (err) {
    console.error(`[STORAGE] ✗ Gagal persist: ${err.message}`);
    return sourceUrl; // fallback — tetap expired, tapi setidaknya tidak crash
  }
}

module.exports = { persistImage, persistImageSafe };
