
'use strict';

const { download } = require('./scrape/sunburst');

const OUTFRAME_PROMPT = `Use the uploaded image as the exact visual reference. Transform the reference photograph into a minimal premium editorial poster composition on a clean warm off-white / ivory background with subtle paper texture and generous negative space inspired by luxury travel magazines.
Place a large, clean-edged vertical rectangular crop of the original photo in the center, slightly above middle. COMPOSITION: Create a strict 3:4 vertical canvas. Use a warm ivory-off-white textured paper background.
FINAL RESULT: A refined cut out of the photorealistic editorial collage with a vertical rectangular photo and the original subject or natural foreground breaking frame into the surrounding ivory negative space. Where it naturally extends beyond the bottom edge, allow foreground flowers, grass, foliage, moss, rocks, water to extend beyond the frame as realistic 3D pop-out`;

module.exports = {
  name: 'Outframe — Editorial Poster',
  slug: 'outframe',
  category: 'image',
  subcategory: null,
  description: 'Ubah foto jadi poster editorial premium — subjek keluar dari frame dengan background ivory.',
  long_description:
    'Foto ditempatkan dalam crop vertikal di tengah kanvas 3:4 dengan background warm ivory + paper texture. Foreground alami (bunga, rumput, air) dibuat "keluar" dari frame sebagai 3D pop-out. Cocok untuk poster travel, portrait, cover majalah.',
  icon: 'Frame',
  defaultCredits: 10,
  requiresLogin: true,

  // ===== HANYA 1 FIELD: upload foto =====
  input: [
    {
      key: 'image',
      type: 'image',
      label: 'Upload Foto',
      required: true,
      hint: 'Foto dengan foreground alami (bunga, rumput, air) menghasilkan pop-out lebih dramatis.',
    },
  ],

  output: { type: 'images' },

  instructions:
    '1. Upload 1 foto\n' +
    '2. Klik Generate\n' +
    '3. Tunggu 2–5 menit\n\n' +
    'Semua pengaturan (model, resolusi, watermark, prompt editorial) sudah di-set otomatis.',

  error_messages: {
    INVALID_IMAGE: 'Format gambar tidak valid',
    MISSING_PROMPT: 'Prompt internal hilang — hubungi admin',
    OTP_TIMEOUT: 'Gagal menerima OTP',
    REGISTER_FAILED: 'Registrasi akun gagal',
    JOB_FAILED: 'Job gagal di provider',
    POLL_TIMEOUT: 'Timeout menunggu hasil',
    COS_UPLOAD_FAILED: 'Upload gambar gagal',
  },

  async handler(input, ctx) {
    if (!input.image) throw new Error('INVALID_IMAGE: foto wajib di-upload');

    const result = await download({
      image: input.image,
      prompt: OUTFRAME_PROMPT,
      resolution: '2K',
      removeWatermark: true,
    });

    return { urls: result.images };
  },
};
