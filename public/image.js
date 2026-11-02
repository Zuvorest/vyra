
import { useState, useRef } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons, PageHeader } from './ui.js';

const MODELS = [
  { id: 'nano', name: 'NanoBanana 2.1', cost: 3, desc: 'Cepat & Hemat', color: '#10B981' },
  { id: 'flare', name: 'ChatGPT Flare', cost: 4, desc: 'Detail & Seimbang', color: '#3B82F6' },
  { id: 'sunburst', name: 'ChatGPT Sunburst', cost: 5, desc: 'Kualitas Tertinggi', color: '#8B5CF6' },
];

const STYLES = [
  { id: 'realistic', label: 'Photorealistic', prompt: 'photorealistic, ultra-realistic, raw photo' },
  { id: 'anime', label: 'Anime', prompt: 'anime style illustration, studio ghibli style, 2d art' },
  { id: '3d', label: '3D Render', prompt: '3d render, octane render, unreal engine 5, highly detailed' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk style, neon lights, futuristic, highly detailed' },
];

const LIGHTINGS = [
  { id: 'studio', label: 'Studio', prompt: 'professional studio lighting, softbox' },
  { id: 'sunset', label: 'Golden Hour', prompt: 'golden hour lighting, warm sunset, cinematic lighting' },
  { id: 'dramatic', label: 'Dramatic', prompt: 'dramatic lighting, high contrast, cinematic shadows' },
];

const RATIOS = [
  { id: '1:1', label: '1:1 (Square)', prompt: 'square aspect ratio, centered composition' },
  { id: '16:9', label: '16:9 (Landscape)', prompt: '16:9 landscape aspect ratio, wide angle' },
  { id: '9:16', label: '9:16 (Portrait)', prompt: '9:16 vertical portrait aspect ratio, full body shot' },
];

export default function ImageStudio() {
  const [mode, setMode] = useState('t2i');
  const [selectedModel, setSelectedModel] = useState('nano');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  
  // State untuk Settings Umum
  const [settings, setSettings] = useState({
    style: '', lighting: '', ratio: '', is8k: false, isDetailed: false
  });

  // State khusus Image to Image (Face Lock, dll)
  const [i2iSettings, setI2iSettings] = useState({
    keepFace: true,
    keepPosture: true,
    keepClothes: false,
    keepBg: false
  });

  const fileInputRef = useRef(null);

  const toggleSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  const toggleBool = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleI2i = (key) => {
    setI2iSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) return alert('Maksimal 5 gambar referensi');

    const newImages = [];
    let processed = 0;

    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) {
        alert(`Gambar ${file.name} melebihi 3MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        newImages.push({ base64: ev.target.result, preview: ev.target.result });
        processed++;
        if (processed === files.length) {
          setImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));

  const handleGenerate = async () => {
    if (!prompt.trim()) return alert('Prompt wajib diisi');
    if (mode === 'i2i' && images.length === 0) return alert('Upload minimal 1 gambar referensi');

    // 1. Gabungkan Prompt User dengan Settings Umum
    let finalPrompt = prompt.trim();
    const styleObj = STYLES.find(s => s.id === settings.style);
    const lightObj = LIGHTINGS.find(l => l.id === settings.lighting);
    const ratioObj = RATIOS.find(r => r.id === settings.ratio);

    if (styleObj) finalPrompt += `, ${styleObj.prompt}`;
    if (lightObj) finalPrompt += `, ${lightObj.prompt}`;
    if (ratioObj) finalPrompt += `, ${ratioObj.prompt}`;
    if (settings.is8k) finalPrompt += `, 8k resolution, highly detailed, masterpiece, best quality`;
    if (settings.isDetailed) finalPrompt += `, intricate details, sharp focus, professional photography`;

    // 2. Gabungkan Prompt Khusus I2I (Face Lock, Body Lock, dll)
    if (mode === 'i2i') {
      if (i2iSettings.keepFace) finalPrompt += `, preserve the exact same face, identical facial features, keep identity 100% accurate, highly detailed face matching the reference`;
      if (i2iSettings.keepPosture) finalPrompt += `, maintain the exact same body posture and pose as the reference image`;
      if (i2iSettings.keepClothes) finalPrompt += `, keep the exact same clothing and outfit as the reference image`;
      if (i2iSettings.keepBg) finalPrompt += `, preserve the exact same background elements as the reference image`;
    }

    const modelConfig = MODELS.find(m => m.id === selectedModel);
    setLoading(true);
    setResults([]);

    try {
      const payload = {
        mode,
        model: selectedModel,
        prompt: finalPrompt, // Kirim prompt yang sudah digabung
        images: mode === 'i2i' ? images.map(img => img.base64) : undefined,
      };

      const res = await api('/api/image-studio/generate', { method: 'POST', body: payload });
      setResults(res.data.images);
      
      setToast(`-${modelConfig.cost} Kredit`);
      setTimeout(() => setToast(null), 3000);
      window.dispatchEvent(new Event('refresh-user'));
    } catch (err) {
      alert(err.message || 'Terjadi kesalahan saat generate');
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div style=${{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
      ${toast && html`
        <div className="vyra-toast">
          <${Icons.Zap} size=${16} /> ${toast}
        </div>
      `}

      <${PageHeader} title="Image Studio" subtitle="Buat mahakarya visual dengan kendali penuh." />

      <div className="flex gap-2" style=${{ marginBottom: '24px', background: 'var(--surface-2)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        <button className=${'btn ' + (mode === 't2i' ? 'btn-primary' : 'btn-ghost')} onClick=${() => setMode('t2i')} style=${{ borderRadius: '8px' }}>Text to Image</button>
        <button className=${'btn ' + (mode === 'i2i' ? 'btn-primary' : 'btn-ghost')} onClick=${() => setMode('i2i')} style=${{ borderRadius: '8px' }}>Image to Image</button>
      </div>

      <div className="image-studio-grid">
        
        <div style=${{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <!-- Model Selector -->
          <div className="card" style=${{ padding: '20px' }}>
            <h3 style=${{ marginBottom: '16px', fontSize: '16px' }}>Pilih Model AI</h3>
            <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              ${MODELS.map(m => html`
                <div key=${m.id} onClick=${() => setSelectedModel(m.id)}
                  style=${{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${selectedModel === m.id ? m.color : 'var(--border)'}`,
                    background: selectedModel === m.id ? `linear-gradient(135deg, ${m.color}15, transparent)` : 'var(--surface)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style=${{ fontWeight: 'bold', marginBottom: '4px', color: selectedModel === m.id ? m.color : 'var(--text)' }}>${m.name}</div>
                  <div className="text-xs text-muted" style=${{ marginBottom: '12px' }}>${m.desc}</div>
                  <span className="badge" style=${{ background: m.color, color: '#fff' }}>${m.cost} Kredit</span>
                </div>
              `)}
            </div>
          </div>

          <!-- Upload Area (I2I Only) -->
          ${mode === 'i2i' && html`
            <div className="card" style=${{ padding: '20px' }}>
              <h3 style=${{ marginBottom: '16px', fontSize: '16px' }}>Gambar Referensi (Maks 5)</h3>
              <input type="file" multiple accept="image/*" ref=${fileInputRef} onChange=${handleImageUpload} style=${{ display: 'none' }} />
              <div className="flex gap-3" style=${{ flexWrap: 'wrap' }}>
                ${images.map((img, i) => html`
                  <div key=${i} style=${{ position: 'relative', width: '90px', height: '90px' }}>
                    <img src=${img.preview} style=${{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)' }} />
                    <button onClick=${() => removeImage(i)} style=${{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      <${Icons.X} size=${14} />
                    </button>
                  </div>
                `)}
                ${images.length < 5 && html`
                  <div onClick=${() => fileInputRef.current?.click()} style=${{ width: '90px', height: '90px', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                    <${Icons.ImagePlus} size=${24} style=${{ marginBottom: '4px' }} />
                    <span style=${{ fontSize: '10px' }}>Tambah</span>
                  </div>
                `}
              </div>
            </div>
          `}

          <!-- Prompt Area -->
          <div className="card" style=${{ padding: '20px' }}>
            <div className="flex justify-between items-center" style=${{ marginBottom: '12px' }}>
              <h3 style=${{ fontSize: '16px' }}>Prompt Utama</h3>
              <span className="text-xs text-muted">${prompt.length} karakter</span>
            </div>
            <textarea className="input" rows="5" placeholder="Jelaskan sedetail mungkin: subjek, latar belakang, suasana..." value=${prompt} onInput=${e => setPrompt(e.target.value)} style=${{ resize: 'vertical' }} />
          </div>

          <button onClick=${handleGenerate} disabled=${loading} className="btn btn-primary" style=${{ width: '100%', height: '56px', fontSize: '18px', borderRadius: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            ${loading ? html`<div className="spinner"></div> Sedang Melukis... (1-3 Menit)` : html`<${Icons.Sparkles} size=${20} /> Generate Sekarang`}
          </button>
        </div>

        <!-- KOLOM KANAN: Settings -->
        <div style=${{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style=${{ padding: '20px' }}>
            <h3 style=${{ marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <${Icons.SlidersHorizontal} size=${18} /> Prompt Enhancer
            </h3>
            
            <div style=${{ marginBottom: '16px' }}>
              <label className="label">Gaya Visual</label>
              <div className="flex gap-2" style=${{ flexWrap: 'wrap' }}>
                ${STYLES.map(s => html`<button key=${s.id} onClick=${() => toggleSetting('style', s.id)} className=${'btn btn-sm ' + (settings.style === s.id ? 'btn-primary' : 'btn-secondary')}>${s.label}</button>`)}
              </div>
            </div>

            <div style=${{ marginBottom: '16px' }}>
              <label className="label">Pencahayaan</label>
              <div className="flex gap-2" style=${{ flexWrap: 'wrap' }}>
                ${LIGHTINGS.map(l => html`<button key=${l.id} onClick=${() => toggleSetting('lighting', l.id)} className=${'btn btn-sm ' + (settings.lighting === l.id ? 'btn-primary' : 'btn-secondary')}>${l.label}</button>`)}
              </div>
            </div>

            <div style=${{ marginBottom: '16px' }}>
              <label className="label">Aspek Rasio</label>
              <div className="flex gap-2" style=${{ flexWrap: 'wrap' }}>
                ${RATIOS.map(r => html`<button key=${r.id} onClick=${() => toggleSetting('ratio', r.id)} className=${'btn btn-sm ' + (settings.ratio === r.id ? 'btn-primary' : 'btn-secondary')}>${r.label}</button>`)}
              </div>
            </div>

            <div style=${{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked=${settings.is8k} onChange=${() => toggleBool('is8k')} style=${{ width: '18px', height: '18px' }} /> Resolusi Tinggi (8K)
              </label>
              <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" checked=${settings.isDetailed} onChange=${() => toggleBool('isDetailed')} style=${{ width: '18px', height: '18px' }} /> Detail Super Tajam
              </label>
            </div>

            <!-- PENGATURAN KHUSUS I2I (FACE LOCK, DLL) -->
            ${mode === 'i2i' && html`
              <div style=${{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <h4 style=${{ fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <${Icons.User} size=${16} /> Kunci Referensi (I2I)
                </h4>
                <div style=${{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked=${i2iSettings.keepFace} onChange=${() => toggleI2i('keepFace')} style=${{ width: '18px', height: '18px' }} /> 
                    <span style=${{ color: 'var(--primary)', fontWeight: '600' }}>Pertahankan Wajah (100% Lock)</span>
                  </label>
                  <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked=${i2iSettings.keepPosture} onChange=${() => toggleI2i('keepPosture')} style=${{ width: '18px', height: '18px' }} /> 
                    Pertahankan Postur Tubuh
                  </label>
                  <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked=${i2iSettings.keepClothes} onChange=${() => toggleI2i('keepClothes')} style=${{ width: '18px', height: '18px' }} /> 
                    Pertahankan Pakaian
                  </label>
                  <label style=${{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked=${i2iSettings.keepBg} onChange=${() => toggleI2i('keepBg')} style=${{ width: '18px', height: '18px' }} /> 
                    Pertahankan Background
                  </label>
                </div>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Hasil Generate -->
      <div style=${{ marginTop: '32px' }}>
        <h3 style=${{ marginBottom: '16px' }}>Galeri Hasil</h3>
        
        ${loading && html`
          <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            ${[1].map(i => html`<div className="skeleton-img" key=${i}></div>`)}
          </div>
        `}

        ${!loading && results.length > 0 && html`
          <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            ${results.map((url, i) => html`
              <div key=${i} className="card" style=${{ padding: '12px' }}>
                <img src=${url} style=${{ width: '100%', borderRadius: '8px', display: 'block' }} />
                <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <a href=${url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style=${{ display: 'flex', justifyContent: 'center', fontSize: '13px' }}>
                    <${Icons.ExternalLink} size=${14} style=${{ marginRight: '4px' }}/> Buka
                  </a>
                  <a href=${url} download="vyra-image.jpg" className="btn btn-primary" style=${{ display: 'flex', justifyContent: 'center', fontSize: '13px' }}>
                    <${Icons.Download} size=${14} style=${{ marginRight: '4px' }}/> Unduh
                  </a>
                </div>
              </div>
            `)}
          </div>
        `}

        ${!loading && results.length === 0 && html`
          <div style=${{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '12px' }}>
            <${Icons.Image} size=${48} style=${{ opacity: 0.5, marginBottom: '12px' }} />
            <p>Belum ada gambar. Silakan atur prompt dan klik Generate.</p>
          </div>
        `}
      </div>
    </div>
  `;
}