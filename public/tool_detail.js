import { useState, useEffect, useRef } from 'https://esm.sh/react@18.3.1';
import { useParams, Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, Button, EmptyState, fmtNum } from './ui.js';

// ================= BEFORE/AFTER SLIDER =================
function BeforeAfter({ before, after }) {
  const [pos, setPos] = useState(50);
  const ref = useRef(null);

  const handleMove = (clientX) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPos((x / rect.width) * 100);
  };

  return html`
    <div className="ba-wrap" ref=${ref}
      onMouseMove=${e => e.buttons === 1 && handleMove(e.clientX)}
      onTouchMove=${e => handleMove(e.touches[0].clientX)}>
      <img src=${after} alt="After" className="ba-img" />
      <div className="ba-overlay" style=${{ width: pos + '%' }}>
        <img src=${before} alt="Before" className="ba-img ba-before" style=${{ width: (100 / (pos || 1)) * 100 + '%' }} />
      </div>
      <div className="ba-handle" style=${{ left: pos + '%' }}>
        <div className="ba-line"></div>
        <div className="ba-grip"><${Icons.ArrowLeftRight} size=${14} /></div>
      </div>
      <div className="ba-label ba-label-before">Before</div>
      <div className="ba-label ba-label-after">After</div>
      <input type="range" min="0" max="100" value=${pos}
        onInput=${e => setPos(Number(e.target.value))}
        className="ba-range" aria-label="Before after slider" />
    </div>
  `;
}

// ================= FIELD RENDERER =================
function Field({ field, value, onChange }) {
  const handleFileUpload = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran maksimal 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result); // Base64 string
    reader.readAsDataURL(file);
  };

  const common = { className: 'input', value: value || '', onInput: e => onChange(e.target.value) };
  
  switch (field.type) {
    case 'textarea':
    case 'prompt':
      return html`
        <div style=${{ marginBottom: '14px' }}>
          <label className="label">${field.label}${field.required ? ' *' : ''}</label>
          <textarea className="input" rows="3" value=${value || ''} onInput=${e => onChange(e.target.value)} placeholder=${field.placeholder || ''} />
          ${field.hint && html`<p className="text-xs text-muted" style=${{ marginTop: '4px' }}>${field.hint}</p>`}
        </div>
      `;
      
    case 'image':
      return html`
        <div style=${{ marginBottom: '16px' }}>
          <label className="label">${field.label}${field.required ? ' *' : ''}</label>
          
          ${value 
            ? html`
                <div style=${{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img src=${value} style=${{ maxWidth: '100%', maxHeight: '250px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', objectFit: 'contain' }} />
                  <button 
                    onClick=${() => onChange('')}
                    style=${{ position: 'absolute', top: '8px', right: '8px', background: 'var(--error)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <${Icons.X} size=${16} />
                  </button>
                </div>
              `
            : html`
                <div 
                  style=${{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)', transition: 'border-color .15s' }}
                  onClick=${() => document.getElementById('file-' + field.key).click()}
                  onDragOver=${(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onDragLeave=${(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; }}
                  onDrop=${(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file);
                  }}
                >
                  <${Icons.ImagePlus} size=${32} style=${{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                  <p className="text-sm" style=${{ fontWeight: '500', marginBottom: '4px' }}>Klik atau Seret Gambar ke Sini</p>
                  <p className="text-xs text-muted">Maksimal 5MB (JPG/PNG)</p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  id=${'file-' + field.key} 
                  style=${{ display: 'none' }} 
                  onChange=${(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                  }} 
                />
              `}
          ${field.hint && html`<p className="text-xs text-muted" style=${{ marginTop: '8px' }}>${field.hint}</p>`}
        </div>
      `;
      
    default:
      return html`
        <div style=${{ marginBottom: '14px' }}>
          <label className="label">${field.label}${field.required ? ' *' : ''}</label>
          <input ...${common} placeholder=${field.placeholder || ''} />
        </div>
      `;
  }
}

function ProgressBar({ elapsed }) {
  // Progress curve: cepat di awal, lambat di akhir (realistis)
  const calcProgress = (s) => {
    if (s < 5) return Math.floor(s * 4);            // 0-20% (0-5s)
    if (s < 15) return 20 + Math.floor((s - 5) * 3);  // 20-50% (5-15s)
    if (s < 40) return 50 + Math.floor((s - 15) * 1.2); // 50-80% (15-40s)
    if (s < 80) return 80 + Math.floor((s - 40) * 0.4); // 80-96% (40-80s)
    return 96;
  };

  const pct = Math.min(96, calcProgress(elapsed));

  const stages = [
    { at: 0, msg: 'Menyiapkan permintaan...' },
    { at: 5, msg: 'Mengunggah gambar ke server AI...' },
    { at: 15, msg: 'Memproses dengan model AI...' },
    { at: 40, msg: 'Menghapus watermark...' },
    { at: 70, msg: 'Menyimpan hasil ke storage...' },
    { at: 90, msg: 'Hampir selesai...' },
  ];
  const stage = [...stages].reverse().find(s => elapsed >= s.at) || stages[0];

  return html`
    <div style=${{ padding: '24px 16px' }}>
      <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
        <${Icons.Loader2} className="spin" size=${28} style=${{ color: 'var(--primary)' }} />
        <h4 style=${{ fontSize: '15px' }}>${stage.msg}</h4>
      </div>

      <div style=${{ maxWidth: '360px', margin: '0 auto' }}>
        <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="mono text-sm" style=${{ fontWeight: '600', color: 'var(--primary)' }}>${pct}%</span>
          <span className="text-xs text-muted">${elapsed}s / ~90s</span>
        </div>
        <div style=${{ height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: pct + '%',
            background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
            transition: 'width 0.6s ease',
            borderRadius: '4px'
          }}></div>
        </div>
        <div style=${{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span className="text-xs text-muted">0%</span>
          <span className="text-xs text-muted">100%</span>
        </div>
      </div>

      <div style=${{ marginTop: '24px', padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '380px', margin: '24px auto 0' }}>
        <${Icons.AlertTriangle} size=${16} color="var(--warning)" />
        <span className="text-xs" style=${{ color: 'var(--warning)', fontWeight: '500' }}>
          Jangan tinggalkan halaman ini. Proses akan berjalan 1-3 menit.
        </span>
      </div>

      <p className="text-xs text-muted" style=${{ textAlign: 'center', marginTop: '12px', maxWidth: '320px', margin: '12px auto 0' }}>
        💡 Pertama kali generate bisa lebih lama karena sistem sedang membuat akun AI baru.
      </p>
    </div>
  `;
}
// ================= MAIN =================
export default function ToolDetail() {
  const { category, slug } = useParams();
  const [tool, setTool] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState({});
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    setTool(null); setNotFound(false); setJob(null); setError('');
    api('/api/feature/public/' + category + '/' + slug)
      .then(r => {
        setTool(r.data.tool);
        const init = {};
        (r.data.tool.input_schema || []).forEach(f => { init[f.key] = f.default ?? ''; });
        setInput(init);
      })
      .catch(() => setNotFound(true));
  }, [category, slug]);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const pollJob = async (jobId) => {
    try {
      const r = await api('/api/jobs/' + jobId);
      const j = r.data.job;
      setJob(j);
      if (j.status === 'completed' || j.status === 'failed') {
        setRunning(false);
        window.dispatchEvent(new Event('refresh-user'));
        if (j.status === 'failed') setError(j.error_message || 'Gagal');
      } else {
        pollRef.current = setTimeout(() => pollJob(jobId), 2000);
      }
    } catch (e) {
      setError(e.message);
      setRunning(false);
    }
  };

  const run = async () => {
    setError(''); setRunning(true); setJob(null);
    try {
      const r = await api('/api/exec/' + tool.id, { method: 'POST', body: { input } });
      const jobId = r.data.job_id;
      pollJob(jobId);
    } catch (e) {
      setError(e.message);
      setRunning(false);
    }
  };

  if (notFound) return html`<${EmptyState} icon=${Icons.AlertCircle} title="Fitur tidak ditemukan" description="Fitur ini belum dipublikasikan atau URL salah." action=${html`<${Link} to="/dashboard/tools" className="btn btn-primary">Kembali ke Katalog<//>`} />`;
  if (!tool) return html`<div className="loading">Memuat...</div>`;

  const credits = tool.pricing?.credits ?? tool.credit_cost ?? 0;
  const isFree = credits === 0;
  const examples = tool.examples || [];

  return html`
    <div className="tool-detail">
      <div className="tool-breadcrumb">
        <${Link} to="/dashboard/tools">Tools<//> / <${Link} to=${'/dashboard/tools?cat=' + category}>${category}<//> / <span>${tool.name}</span>
      </div>

      <div className="tool-hero">
        <div>
          <h1 className="tool-detail-title">${tool.name}</h1>
          ${tool.description && html`<p className="tool-detail-sub">${tool.description}</p>`}
          <div className="tool-tags">
            ${tool.label && html`<span className="badge badge-primary">${tool.label}</span>`}
            <span className="badge badge-success">${isFree ? 'Free' : credits + ' credits'}</span>
            ${tool.requires_login && html`<span className="badge">Login required</span>`}
          </div>
        </div>
        ${tool.cover_image && html`<img src=${tool.cover_image} alt=${tool.name} className="tool-cover" />`}
      </div>

      ${examples.length > 0 && html`
        <${Card} style=${{ marginBottom: '16px' }}>
          <h3 style=${{ marginBottom: '16px' }}>Before / After</h3>
          ${examples.map((ex, i) => ex.before && ex.after && html`<${BeforeAfter} key=${i} before=${ex.before} after=${ex.after} />`)}
        <//>
      `}

      <div className="tool-run-grid">
        <${Card}>
          <h3 style=${{ marginBottom: '16px' }}>Input</h3>
          ${(tool.input_schema || []).map(f => html`
            <${Field} key=${f.key} field=${f} value=${input[f.key]}
              onChange=${v => setInput(prev => ({ ...prev, [f.key]: v }))} />
          `)}
          ${error && html`<div className="badge badge-error" style=${{ display: 'block', padding: '10px', marginBottom: '12px' }}>${error}</div>`}
          <${Button} onClick=${run} disabled=${running} style=${{ width: '100%' }}>
            ${running ? 'Memproses...' : html`<${Icons.Play} size=${16} /> Jalankan (${isFree ? 'Gratis' : credits + ' kredit'})`}
          <//>
        <//>

        <${Card}>
          <h3 style=${{ marginBottom: '16px' }}>Hasil</h3>
          ${!job && html`<p className="text-muted text-sm">Belum ada hasil. Klik Jalankan untuk memulai.</p>`}
          ${job?.status === 'processing' && html`
            <div style=${{ textAlign: 'center', padding: '24px' }}>
              <${Icons.Loader2} className="spin" size=${24} style=${{ color: 'var(--primary)' }} />
              <p className="text-sm text-muted" style=${{ marginTop: '12px' }}>Sedang memproses...</p>
            </div>
          `}
          ${job?.status === 'failed' && html`
            <div className="badge badge-error" style=${{ display: 'block', padding: '12px' }}>${job.error_message || 'Gagal'}</div>
          `}
          ${job?.status === 'completed' && html`<${ResultView} job=${job} output=${tool.output_schema} />`}
        <//>
      </div>

      ${tool.instructions && html`
        <${Card} style=${{ marginTop: '16px' }}>
          <h3 style=${{ marginBottom: '12px' }}>Cara Pakai</h3>
          <pre style=${{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: 'var(--text-muted)' }}>${tool.instructions}</pre>
        <//>
      `}
    </div>
  `;
}

function ResultView({ job, output }) {
  const out = job.result || job.output || {};
  const type = output?.type || 'text';
  if (type === 'image' && out.url) {
    return html`
      <img src=${out.url} alt="Result" style=${{ width: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
      <a href=${out.url} download target="_blank" className="btn btn-secondary" style=${{ marginTop: '12px', width: '100%' }}>
        <${Icons.Download} size=${14} /> Download
      </a>
    `;
  }
  if (type === 'images' && Array.isArray(out.urls)) {
    return html`<div className="flex gap-2" style=${{ flexWrap: 'wrap' }}>
      ${out.urls.map((u, i) => html`<img key=${i} src=${u} style=${{ width: '48%', borderRadius: 'var(--radius)' }} />`)}
    </div>`;
  }
  if (type === 'video' && out.url) return html`<video src=${out.url} controls style=${{ width: '100%', borderRadius: 'var(--radius)' }}></video>`;
  if (type === 'audio' && out.url) return html`<audio src=${out.url} controls style=${{ width: '100%' }}></audio>`;
  if (type === 'text') return html`<pre style=${{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>${out.text || JSON.stringify(out, null, 2)}</pre>`;
  return html`<pre style=${{ fontSize: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', overflow: 'auto' }}>${JSON.stringify(out, null, 2)}</pre>`;
}