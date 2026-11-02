import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null); // Hanya tampil sekali
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api('/api/keys').then(res => setKeys(res.data.keys)).catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true); setError(''); setNewKey(null);
    try {
      const res = await api('/api/keys', { method: 'POST', body: { name: name.trim() } });
      setNewKey(res.data.key); // raw key — sekali tampil
      setName('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert('Gagal menyalin. Salin manual dari kotak di atas.'); }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Cabut API key ini? Aplikasi yang memakainya akan berhenti bekerja.')) return;
    setRevoking(id);
    try {
      await api('/api/keys/' + id, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRevoking(null);
    }
  };

  return html`
    <div style=${{ maxWidth: '900px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>API Keys</h2>
        <p className="text-xs text-muted">Kunci akses untuk Developer API. Rahasiakan seperti password.</p>
      </div>

      ${error && html`<div className="badge badge-error" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${error}</div>`}

      ${newKey && html`
        <${Card} style=${{ marginBottom: '16px', borderColor: 'var(--success)' }}>
          <h3 style=${{ marginBottom: '8px', color: 'var(--success)' }}>✅ Key berhasil dibuat — salin sekarang</h3>
          <p className="text-xs text-muted" style=${{ marginBottom: '12px' }}>Key ini hanya ditampilkan sekali. Jangan tutup halaman sebelum menyalin.</p>
          <div style=${{ 
            background: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius)', 
            fontFamily: 'Geist Mono, monospace', fontSize: '13px', wordBreak: 'break-all',
            border: '1px solid var(--border)', marginBottom: '12px'
          }}>${newKey}</div>
          <${Button} variant="primary" onClick=${() => handleCopy(newKey)}>
            <${Icons.Copy} size=${16} /> ${copied ? 'Tersalin!' : 'Salin Key'}
          <//>
        <//>
      `}

      <${Card} style=${{ marginBottom: '24px' }}>
        <h3 style=${{ marginBottom: '16px' }}>Buat Key Baru</h3>
        <form onSubmit=${handleCreate} className="flex gap-2" style=${{ flexWrap: 'wrap' }}>
          <input 
            className="input" style=${{ flex: 1, minWidth: '200px' }}
            placeholder="Nama key (mis: Production App)"
            value=${name} onInput=${e => setName(e.target.value)}
          />
          <${Button} type="submit" disabled=${creating || !name.trim()}>
            ${creating ? 'Membuat...' : html`<${Icons.Plus} size=${16} /> Buat`}
          <//>
        </form>
      <//>

      <${Card}>
        <h3 style=${{ marginBottom: '16px' }}>Daftar Key (${keys.length})</h3>
        ${keys.length === 0 && html`<p className="text-muted text-sm">Belum ada API key. Buat satu untuk mulai memakai Developer API.</p>`}
        <div style=${{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          ${keys.map(k => html`
            <div key=${k.id} style=${{ 
              padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              background: k.revoked_at ? 'var(--surface-2)' : 'var(--surface)', opacity: k.revoked_at ? 0.6 : 1
            }}>
              <div className="flex justify-between items-center" style=${{ marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <strong>${k.name}</strong>
                  ${k.revoked_at && html` <span className="badge badge-error">Dicabut</span>`}
                </div>
                <span className="mono text-xs text-muted">${k.prefix}…</span>
              </div>
              <div className="text-xs text-muted" style=${{ marginBottom: '12px' }}>
                Dibuat: ${new Date(k.created_at).toLocaleDateString('id-ID')} · 
                Terakhir dipakai: ${k.last_used_at ? new Date(k.last_used_at).toLocaleString('id-ID') : 'Belum pernah'}
              </div>
              ${!k.revoked_at && html`
                <${Button} variant="danger" size="sm" onClick=${() => handleRevoke(k.id)} disabled=${revoking === k.id}>
                  ${revoking === k.id ? 'Mencabut...' : html`<${Icons.Trash2} size=${14} /> Cabut`}
                <//>
              `}
            </div>
          `)}
        </div>
      <//>
    </div>
  `;
}