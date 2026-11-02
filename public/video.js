import { useState, useEffect, useRef } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function VideoStudio() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('5');
  const [aspect, setAspect] = useState('16:9');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // Ambil model bertipe video
  useEffect(() => {
    api('/api/models').then(res => {
      const videoModels = res.data.models.filter(m => m.type === 'video');
      setModels(videoModels);
      if (videoModels.length > 0) setSelectedModel(videoModels[0].id);
    }).catch(console.error);
  }, []);

  // Timer untuk menampilkan waktu berjalan
  useEffect(() => {
    if (isProcessing) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isProcessing]);

  // Cleanup polling saat unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const pollJob = async (jobId) => {
    try {
      const res = await api('/api/jobs/' + jobId);
      const job = res.data.job;

      if (job.status === 'completed') {
        setResult({
          status: 'success',
          output: job.output,
          input: job.input,
          completed_at: job.completed_at,
          duration_actual: elapsed
        });
        setIsProcessing(false);
        window.dispatchEvent(new Event('refresh-user'));
      } else if (job.status === 'failed') {
        setResult({ status: 'error', message: job.error_message || 'Video gagal dibuat.' });
        setIsProcessing(false);
      } else {
        // Video job biasanya butuh waktu lebih lama — polling tiap 3 detik
        pollRef.current = setTimeout(() => pollJob(jobId), 3000);
      }
    } catch (err) {
      setResult({ status: 'error', message: err.message });
      setIsProcessing(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing || !selectedModel) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const res = await api('/api/jobs', {
        method: 'POST',
        body: {
          model_id: selectedModel,
          input: {
            prompt: prompt.trim(),
            duration: Number(duration),
            aspect_ratio: aspect
          }
        }
      });
      pollJob(res.data.job_id);
    } catch (err) {
      setResult({ status: 'error', message: err.message });
      setIsProcessing(false);
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);
  const estimatedCredits = selectedModelData?.credit_cost || 0;

  return html`
    <div style=${{ maxWidth: '900px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Video Studio</h2>
        <p className="text-xs text-muted">Hasilkan video pendek dari teks. Proses lebih lama dari chat atau gambar.</p>
      </div>

      ${models.length === 0 && html`
        <${Card} style=${{ marginBottom: '16px', borderColor: 'var(--warning)' }}>
          <div className="flex items-center gap-3">
            <${Icons.AlertTriangle} size=${20} color="var(--warning)" />
            <div>
              <h3 style=${{ marginBottom: '4px' }}>Model video belum tersedia</h3>
              <p className="text-sm text-muted">
                Admin belum mengaktifkan model video di database. Fitur ini akan aktif otomatis saat model video ditambahkan.
              </p>
            </div>
          </div>
        <//>
      `}

      <${Card} style=${{ marginBottom: '24px' }}>
        <form onSubmit=${handleGenerate}>
          <div style=${{ marginBottom: '16px' }}>
            <label className="label">Prompt Video</label>
            <textarea
              className="input"
              value=${prompt}
              onInput=${e => setPrompt(e.target.value)}
              placeholder="Deskripsikan video yang ingin dibuat — adegan, gerakan kamera, suasana..."
              required
              style=${{ minHeight: '100px' }}
              disabled=${isProcessing}
            />
          </div>

          <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="label">Model</label>
              <select
                className="input"
                value=${selectedModel}
                onChange=${e => setSelectedModel(e.target.value)}
                disabled=${isProcessing || models.length === 0}
              >
                ${models.length === 0
                  ? html`<option>Tidak ada model video</option>`
                  : models.map(m => html`<option value=${m.id} key=${m.id}>${m.name} (${m.credit_cost} Kredit)</option>`)}
              </select>
            </div>

            <div>
              <label className="label">Durasi</label>
              <select className="input" value=${duration} onChange=${e => setDuration(e.target.value)} disabled=${isProcessing}>
                <option value="5">5 detik</option>
                <option value="10">10 detik</option>
                <option value="15">15 detik</option>
              </select>
            </div>

            <div>
              <label className="label">Rasio</label>
              <select className="input" value=${aspect} onChange=${e => setAspect(e.target.value)} disabled=${isProcessing}>
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center" style=${{ flexWrap: 'wrap', gap: '12px' }}>
            ${estimatedCredits > 0 && html`
              <div className="text-sm text-muted">
                Estimasi biaya: <strong style=${{ color: 'var(--primary)' }}>${estimatedCredits} Kredit</strong>
              </div>
            `}
            <${Button} type="submit" disabled=${isProcessing || !prompt.trim() || models.length === 0}>
              ${isProcessing
                ? html`<${Icons.Loader2} className="spin" size=${18} /> Memproses ${elapsed}s...`
                : html`<${Icons.Video} size=${18} /> Generate Video`}
            <//>
          </div>
        </form>
      <//>

      ${isProcessing && html`
        <${Card} style=${{ marginBottom: '16px' }}>
          <div className="flex items-center gap-3" style=${{ marginBottom: '16px' }}>
            <${Icons.Loader2} className="spin" size=${20} color="var(--primary)" />
            <div>
              <h3 style=${{ marginBottom: '2px' }}>Sedang memproses...</h3>
              <p className="text-xs text-muted">Waktu berjalan: ${elapsed} detik</p>
            </div>
          </div>
          <div style=${{ height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style=${{
              height: '100%',
              width: Math.min(95, (elapsed / 10) * 100) + '%',
              background: 'var(--primary)',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <p className="text-xs text-muted" style=${{ marginTop: '12px' }}>
            Jangan tutup halaman ini. Video akan muncul otomatis setelah selesai.
          </p>
        <//>
      `}

      ${result && result.status === 'error' && html`
        <${Card} style=${{ marginBottom: '16px', borderColor: 'var(--error)' }}>
          <div className="flex items-center gap-3">
            <${Icons.XCircle} size=${20} color="var(--error)" />
            <div>
              <h3 style=${{ marginBottom: '4px' }}>Gagal membuat video</h3>
              <p className="text-sm text-muted">${result.message}</p>
            </div>
          </div>
        <//>
      `}

      ${result && result.status === 'success' && html`
        <${Card}>
          <h3 style=${{ marginBottom: '16px' }}>Hasil Video</h3>
          <div style=${{
            aspectRatio: aspect.replace(':', '/'),
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
            border: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <${Icons.Video} size=${48} style=${{ opacity: 0.3, marginBottom: '16px', color: 'var(--text-muted)' }} />
            <p className="text-sm" style=${{ marginBottom: '8px', fontWeight: '500' }}>Job berhasil diproses</p>
            <p className="text-xs text-muted" style=${{ marginBottom: '16px', maxWidth: '400px' }}>
              ${result.output?.message || 'Output tersimpan di database.'}
            </p>
            <div className="badge badge-warning" style=${{ marginBottom: '12px' }}>
              <${Icons.AlertTriangle} size=${12} /> Provider video belum aktif
            </div>
            <p className="text-xs text-muted" style=${{ maxWidth: '400px' }}>
              File video akan muncul di sini setelah admin menghubungkan provider AI nyata (Replicate/Runway/Pika).
            </p>
          </div>

          <div style=${{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div>
              <div className="text-xs text-muted">Prompt</div>
              <div style=${{ wordBreak: 'break-word' }}>${result.input?.prompt || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Durasi</div>
              <div>${result.input?.duration || '-'} detik</div>
            </div>
            <div>
              <div className="text-xs text-muted">Rasio</div>
              <div>${result.input?.aspect_ratio || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Waktu Proses</div>
              <div>${result.duration_actual || 0} detik</div>
            </div>
          </div>

          <div className="flex gap-2" style=${{ marginTop: '16px', flexWrap: 'wrap' }}>
            <${Button} variant="secondary" disabled=${true}>
              <${Icons.Download} size=${16} /> Download (belum tersedia)
            <//>
            <${Button} variant="secondary" onClick=${() => { setPrompt(''); setResult(null); }}>
              <${Icons.RefreshCw} size=${16} /> Buat Video Baru
            <//>
          </div>
        <//>
      `}
    </div>
  `;
}