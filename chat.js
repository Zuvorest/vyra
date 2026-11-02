
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { requireAuth } = require('./guard');
const db = require('./db');
const { processChat } = require('./ai/scrape/character_chat');

const sendSchema = z.object({
  message: z.string().min(1, 'Pesan tidak boleh kosong'),
  mode: z.enum(['audio', 'text']).default('text'),
  character_id: z.string().default('elisa'),
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const charId = req.query.character_id || 'elisa';
    const { data: session } = await db.admin.from('chat_sessions').select('id').eq('user_id', req.user.id).eq('character_id', charId).maybeSingle();
    if (!session) return res.json({ success: true, data: [], error: null, message: 'Belum ada riwayat' });
    
    const { data: msgs, error } = await db.admin.from('chat_messages')
      .select('role, content, audio_url, created_at')
      .eq('session_id', session.id).order('created_at', { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, data: msgs, error: null, message: 'OK' });
  } catch (err) { next(err); }
});

router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { message, mode, character_id } = sendSchema.parse(req.body);
    
    const cost = mode === 'audio' ? 4 : 2;
    const refId = `chat_${Date.now()}_${req.user.id}`;

    const { error: creditErr } = await db.admin.rpc('credit_debit', {
      p_user_id: req.user.id, p_amount: cost, p_reason: `chat_${character_id}_${mode}`, p_ref_id: refId,
    });

    if (creditErr) {
      return res.status(400).json({ success: false, data: null, error: 'INSUFFICIENT_CREDITS', message: `Kredit tidak cukup. Butuh ${cost} kredit.` });
    }

    let result;
    try {
      result = await processChat(req.user.id, character_id, message, mode);
    } catch (chatErr) {
      await db.admin.rpc('credit_add', { p_user_id: req.user.id, p_amount: cost, p_reason: `refund_chat_fail`, p_ref_id: refId + '_refund' });
      throw chatErr;
    }

    res.json({ success: true, data: result, error: null, message: 'Pesan terkirim' });
  } catch (err) { next(err); }
});

router.delete('/clear', requireAuth, async (req, res, next) => {
  try {
    const charId = req.query.character_id || 'elisa';
    const { data: session } = await db.admin.from('chat_sessions').select('id').eq('user_id', req.user.id).eq('character_id', charId).maybeSingle();
    if (!session) return res.json({ success: true, data: null, error: null, message: 'Tidak ada chat' });

    const { data: msgs } = await db.admin.from('chat_messages').select('audio_url').eq('session_id', session.id).not('audio_url', 'is', null);
    if (msgs && msgs.length > 0) {
      const files = msgs.map(m => m.audio_url.split('/').pop()).filter(Boolean);
      if (files.length > 0) await db.admin.storage.from('chat-audio').remove(files);
    }

    await db.admin.from('chat_messages').delete().eq('session_id', session.id);
    await db.admin.from('chat_sessions').delete().eq('id', session.id);

    res.json({ success: true, data: null, error: null, message: 'Chat berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
