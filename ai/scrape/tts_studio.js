
'use strict';

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../db');

const JOJAPI_KEY = 'jk_uoAJVkAtCO28bGlQpOdXnngP7ZsPOIxCBWEB6UoP3po6xEqZOsCpR48Z1YcwzXxS';
const JOJAPI_BASE = 'https://itsrose-api.jojapi.net/audio';

async function getModels() {
  try {
    const res = await axios.get(`${JOJAPI_BASE}/get_models`, {
      headers: { "X-JOJAPI-Key": JOJAPI_KEY }
    });
    const data = res.data?.data || res.data?.models || res.data;
    if (!data) throw new Error('NO_DATA');
    return data; 
  } catch (error) {
    console.error('[TTS] Get Models Error:', error.message);
    throw error;
  }
}

async function generateSpeech(text, voiceId, modelId) {
  try {
    const ttsRes = await axios.post(`${JOJAPI_BASE}/text_to_speech`, {
      text: text,
      voice_id: voiceId,
      model_id: modelId,
      output_format: "mp3_44100_128",
      language_code: "id",
      apply_text_normalization: "auto",
      voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.7, use_speaker_boost: true }
    }, {
      headers: { "Content-Type": "application/json", "X-JOJAPI-Key": JOJAPI_KEY }
    });

    if (!ttsRes.data || ttsRes.data.ok === false) {
      throw new Error('API_ERROR: Gagal generate suara');
    }

    const base64 = ttsRes.data.data.audio_base64 || ttsRes.data.data.audio;
    if (!base64) throw new Error('NO_AUDIO_DATA');

    const filename = `tts_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp3`;
    const buffer = Buffer.from(base64, 'base64');

    const { error: uploadError } = await db.admin.storage
      .from('chat-audio')
      .upload(filename, buffer, { contentType: 'audio/mpeg', upsert: false });

    if (uploadError) throw new Error('UPLOAD_FAILED: ' + uploadError.message);

    const { data: publicUrlData } = db.admin.storage.from('chat-audio').getPublicUrl(filename);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('[TTS Studio] Error:', error.message);
    
    // MENAMPILKAN ALASAN ASLI DARI JOJAPI
    if (error.response && error.response.data) {
      console.error('[TTS Studio] Detail Jojapi:', JSON.stringify(error.response.data, null, 2));
    }
    
    throw error;
  }
}

module.exports = { getModels, generateSpeech };
