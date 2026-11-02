
'use strict';

const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { requireAuth } = require('./guard');
const db = require('./db');
const { getModels, generateSpeech } = require('./ai/scrape/tts_studio');

const MODEL_COSTS = {
  'eleven_v4': 3,
  'eleven_v4_turbo': 4,
  'eleven_v3': 3,
  'eleven_v3_conversational': 3,
  'eleven_multilingual_v2': 2,
  'eleven_flash_v2_5': 1
};

router.get('/models', requireAuth, async (req, res, next) => {
  try {
    const models = await getModels();
    res.json({ success: true, data: models, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

const generateSchema = z.object({
  text: z.string().min(1, 'Teks tidak boleh kosong'),
  voice_id: z.string().default('o5s6XRBkPSTD4syv6mZg'),
  model_id: z.string().default('eleven_v4'),
});

router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { text, voice_id, model_id } = generateSchema.parse(req.body);
    
    // 👇 INI OBATNYA: Paksa ganti elevenv4 jadi eleven_v4 👇
    let finalModelId = model_id;
    if (finalModelId === 'elevenv4') finalModelId = 'eleven_v4';
    
    // Tentukan biaya kredit (fallback ke 3 jika tidak ada)
    const cost = MODEL_COSTS[finalModelId] || 3;
    const refId = `tts_${Date.now()}_${req.user.id}`;

    // 1. Potong Kredit
    const { error: creditErr } = await db.admin.rpc('credit_debit', {
      p_user_id: req.user.id,
      p_amount: cost,
      p_reason: `audio_studio_${finalModelId}`,
      p_ref_id: refId,
    });

    if (creditErr) {
      return res.status(400).json({ success: false, data: null, error: 'INSUFFICIENT_CREDITS', message: `Kredit tidak cukup. Butuh ${cost} kredit.` });
    }

    let audioUrl;
    try {
      // 2. Kirim finalModelId (yang sudah ada garis bawahnya) ke Jojapi
      audioUrl = await generateSpeech(text, voice_id, finalModelId);
    } catch (genErr) {
      // 3. Refund jika Jojapi masih error
      await db.admin.rpc('credit_add', { p_user_id: req.user.id, p_amount: cost, p_reason: `refund_audio_fail`, p_ref_id: refId + '_refund' });
      throw genErr;
    }

    res.json({ success: true, data: { audio_url: audioUrl }, error: null, message: 'Berhasil generate suara' });
  } catch (err) { next(err); }
});

module.exports = router;
