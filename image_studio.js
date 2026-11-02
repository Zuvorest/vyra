
'use strict';

const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { requireAuth } = require('./guard');
const db = require('./db');
const { generateImage } = require('./ai/scrape/image_studio');

const MODEL_MAP = {
  sunburst: { version: 22005, cost: 5 },
  flare: { version: 22005, cost: 4 },
  nano: { version: 22006, cost: 3 },
};

const generateSchema = z.object({
  mode: z.enum(['t2i', 'i2i']),
  model: z.enum(['sunburst', 'flare', 'nano']),
  prompt: z.string().min(1, 'Prompt wajib diisi'),
  images: z.array(z.string()).optional(),
});

router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { mode, model, prompt, images } = generateSchema.parse(req.body);
    
    // Validasi tambahan untuk I2I
    if (mode === 'i2i' && (!images || images.length === 0)) {
      return res.status(400).json({ success: false, data: null, error: 'VALIDATION_ERROR', message: 'Minimal upload 1 gambar untuk Image2Image' });
    }

    const modelConfig = MODEL_MAP[model];
    const cost = modelConfig.cost;
    const refId = `img_${Date.now()}_${req.user.id}`;

    // 1. Potong Kredit
    const { error: creditErr } = await db.admin.rpc('credit_debit', {
      p_user_id: req.user.id,
      p_amount: cost,
      p_reason: `img_studio_${model}`,
      p_ref_id: refId,
    });

    if (creditErr) {
      return res.status(400).json({ success: false, data: null, error: 'INSUFFICIENT_CREDITS', message: `Kredit tidak cukup. Butuh ${cost} kredit.` });
    }

    let result;
    try {
      // 2. Generate Image
      result = await generateImage({
        mode, prompt, images, 
        modelVersion: modelConfig.version,
        resolution: '2K',
        removeWatermark: true
      });
    } catch (genErr) {
      // 3. Refund jika gagal
      await db.admin.rpc('credit_add', { p_user_id: req.user.id, p_amount: cost, p_reason: `refund_img_studio_fail`, p_ref_id: refId + '_refund' });
      throw genErr;
    }

    res.json({ success: true, data: result, error: null, message: 'Berhasil generate gambar' });
  } catch (err) { next(err); }
});

module.exports = router;
