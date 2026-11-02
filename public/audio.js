
import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons, PageHeader } from './ui.js';

const VOICES = [
  { id: 'o5s6XRBkPSTD4syv6mZg', name: 'Elisa (Lembut)' },
  { id: 'd15jrIAARvF899pDoC6T', name: 'Cila (Cengeng)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Wanita)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Pria)' },
  { id: 'custom', name: '✨ Voice ID Sendiri' }
];

const DEFAULT_MODELS = [
  { id: 'eleven_v4', name: 'Eleven V4', cost: 3 },
  { id: 'eleven_v4_turbo', name: 'Eleven V4 Turbo', cost: 4 },
  { id: 'eleven_v3', name: 'Eleven V3', cost: 3 },
  { id: 'eleven_v3_conversational', name: 'V3 Conversational', cost: 3 },
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', cost: 2 },
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', cost: 1 },
];

const AUDIO_TAGS = `PANDUAN AUDIO TAGS (Eleven V3, V4, V4 Turbo)
Format: Gunakan tanda kurung siku [], letakkan sebelum kalimat.

1. EMOSI POSITIF:
[happy], [excited], [playful], [amazed], [powerful], [proud], [optimistic], [startled], [curious], [content], [peaceful], [trusting], [hopeful], [mischievously], [triumphant]

2. EMOSI NEGATIF:
[sad], [angry], [mad], [aggressive], [bitter], [critical], [repelled], [anxious], [stressed], [scared], [threatened], [vulnerable], [confused], [crying], [despair], [tired], [bored], [distant], [worried], [upset]

3. EMOSI TENANG:
[peaceful], [content], [thoughtful], [trusting], [calm], [gentle], [reassuring], [soothing], [affectionate], [loving], [tender]

4. DELIVERY / GAYA BICARA:
[whispers], [shouts], [softly], [quietly], [sarcastic], [dramatically], [low voice], [high-pitched voice], [breathy voice], [seductively], [confidently], [hesitantly]

5. KECEPATAN DAN INTONASI:
[slowly], [rushed], [hurried], [drawn out], [long pause], [short pause], [hesitates], [stammers], [emphasizing], [exaggerated]

6. REAKSI MANUSIA:
[laughs], [giggles], [chuckles], [sighs], [gasps], [snorts], [clears throat], [swallows], [crying softly], [sobbing], [sniffles], [screams]

7. SOUND EFFECTS:
[applause], [clapping], [gunshot], [explosion], [light rain], [phone buzzing]

8. KOMBINASI:
[whispering] [nervous], [excited] [rushed], [softly] [loving], [crying] [vulnerable], [playful] [mischievously], [angry] [shouting], [calm] [reassuring]

9. CUSTOM NATURAL LANGUAGE:
[soft, warm and affectionate female voice], [speaking like a caring girlfriend], [shy, nervous and slightly trembling voice]`;

export default function AudioStudio() {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [modelId, setModelId] = useState('eleven_v4'); 
  
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api('/api/audio-studio/models')
      .then(res => {
        const data = res.data || [];
        let parsed = [];
        if (Array.isArray(data)) {
          parsed = data.map(m => {
            let mid = typeof m === 'string' ? m : (m.id || m.model_id);
            // 👇 PERBAIKAN: Ubah elevenv4 jadi eleven_v4 👇
            if (mid === 'elevenv4') mid = 'eleven_v4';
            
            const mname = typeof m === 'string' ? m : (m.name || mid);
            const match = DEFAULT_MODELS.find(d => d.id === mid);
            return { id: mid, name: mname, cost: match ? match.cost : 3 };
          });
        }
        if (parsed.length > 0) {
          setModels(parsed);
          const def = parsed.find(m => m.id === 'eleven_v4') || parsed[0];
          setModelId(def.id);
        }
      })
      .catch(() => console.warn('Gagal load model API, pakai default.'))
      .finally(() => setLoadingModels(false));
  }, []);

  const activeModel = models.find(m => m.id === modelId) || { cost: 3 };

  const handleGenerate = async () => {
    if (!text.trim()) return alert('Teks wajib diisi');
    
    let finalVoiceId = voiceId;
    if (voiceId === 'custom') {
      if (!customVoiceId.trim()) return alert('Masukkan Voice ID ElevenLabs terlebih dahulu!');
      finalVoiceId = customVoiceId.trim();
    }
    
    setLoading(true);
    setResult(null);

    try {
      const res = await api('/api/audio-studio/generate', {
        method: 'POST',
        body: { text, voice_id: finalVoiceId, model_id: modelId }
      });
      
      setResult(res.data.audio_url);
      setToast(`-${activeModel.cost} Kredit`);
      setTimeout(() => setToast(null), 3000);
      window.dispatchEvent(new Event('refresh-user'));
    } catch (err) {
      alert(err.message || 'Terjadi kesalahan saat generate suara');
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div style=${{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      ${toast && html`<div className="vyra-toast"><${Icons.Zap} size=${16} /> ${toast}</div>`}

      <${PageHeader} title="Audio Studio" subtitle="Ubah teks menjadi suara realistis dengan AI (Text to Speech)." />

      <div className="card" style=${{ padding: '24px', marginBottom: '24px' }}>
        
        <div className="audio-form-grid">
          <div>
            <label className="label">Pilih Model AI</label>
            <select className="input" value=${modelId} onChange=${e => setModelId(e.target.value)}>
              ${loadingModels ? html`<option>Memuat model...</option>` : models.map(m => html`
                <option value=${m.id}>${m.name} (${m.cost} Kredit)</option>
              `)}
            </select>
          </div>

          <div>
            <label className="label">Pilih Karakter Suara</label>
            <select className="input" value=${voiceId} onChange=${e => setVoiceId(e.target.value)}>
              ${VOICES.map(v => html`<option value=${v.id}>${v.name}</option>`)}
            </select>
          </div>
        </div>

        ${voiceId === 'custom' && html`
          <div style=${{ marginBottom: '20px', padding: '16px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <label className="label">Masukkan ElevenLabs Voice ID</label>
            <input type="text" className="input" placeholder="Contoh: 21m00Tcm4TlvDq8ikWAM" value=${customVoiceId} onInput=${e => setCustomVoiceId(e.target.value)} style=${{ width: '100%', padding: '12px', borderRadius: '8px' }} />
          </div>
        `}

        <div style=${{ marginBottom: '20px' }}>
          <div className="flex justify-between items-center" style=${{ marginBottom: '8px' }}>
            <label className="label" style=${{ marginBottom: 0 }}>Teks yang akan diubah</label>
            <span className="text-xs text-muted">${text.length} karakter</span>
          </div>
          
          <details style=${{ marginBottom: '12px', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <summary style=${{ cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: 'var(--primary)' }}>
              💡 Lihat Panduan Audio Tags (Eleven V3+)
            </summary>
            <pre style=${{ whiteSpace: 'pre-wrap', fontSize: '11px', marginTop: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto' }}>
              ${AUDIO_TAGS}
            </pre>
          </details>

          <textarea className="input" rows="6" placeholder="Tulis teks di sini..." value=${text} onInput=${e => setText(e.target.value)} style=${{ resize: 'vertical', width: '100%' }} />
        </div>

        <button onClick=${handleGenerate} disabled=${loading || !text.trim()} className="btn btn-primary" style=${{ width: '100%', height: '50px', fontSize: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          ${loading ? html`<div className="spinner"></div> Memproses Suara...` : html`<${Icons.AudioLines} size=${20} /> Generate Suara (${activeModel.cost} Kredit)`}
        </button>
      </div>

      ${result && html`
        <div className="card" style=${{ padding: '24px', textAlign: 'center', background: 'var(--surface-2)' }}>
          <h3 style=${{ marginBottom: '16px', color: 'var(--success)' }}>✨ Suara Berhasil Dibuat!</h3>
          <audio controls src=${result} style=${{ width: '100%', marginBottom: '16px', borderRadius: '8px' }}></audio>
          <a href=${result} download="vyra-audio.mp3" className="btn btn-primary" style=${{ display: 'inline-flex', padding: '12px 24px', borderRadius: '8px' }}>
            <${Icons.Download} size=${18} style=${{ marginRight: '8px' }} /> Unduh Audio
          </a>
        </div>
      `}
    </div>
  `;
}
