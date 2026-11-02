'use strict';
const { generateFull } = require('./_domo_client');

module.exports = {
  name: 'Ghibli Style',
  slug: 'ghibli',
  category: 'edited-image',
  description: 'Ubah foto Anda menjadi ilustrasi gaya animasi Ghibli dengan sentuhan cat air.',
  icon: 'Palette',
  defaultCredits: 10,
  requiresLogin: true,
  input: [
    { key: 'image', type: 'image', label: 'Upload Foto', required: true, hint: 'Pilih atau seret gambar ke sini' },
    { key: 'prompt', type: 'textarea', label: 'Detail Tambahan (Opsional)', required: false, placeholder: 'Contoh: sunset, makhluk mitologi, pencahayaan hangat' }
  ],
  output: { type: 'image' },
  async handler(input, ctx) {
    const result = await generateFull({
      mode: 'i2i',
      images: input.image,
      prompt: input.prompt || 'Ghibli style, anime illustration, beautiful lighting',
      removeWatermark: true
    });

    if (!result.images || result.images.length === 0) {
      throw new Error('Gagal generate gambar. Coba lagi nanti.');
    }

    return { url: result.images[0] };
  }
};
