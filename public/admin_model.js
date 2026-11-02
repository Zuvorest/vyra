import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function AdminModels() {
  const [models, setModels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    api('/api/admin/models').then(r => setModels(r.data.models || [])).catch(e => setMessage(e.message));
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (m) => {
    try {
      await api('/api/admin/models/' + m.id, {
        method: 'PATCH', body: { is_active: !m.is_active }
      });
      setMessage(`Model ${m.name} ${!m.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      load();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { alert('Gagal: ' + err.message); }
  };

  const handleSaveCost = async () => {
    const c = Number(cost);
    if (!Number.isInteger(c) || c < 0) { alert('Harga harus bilangan bulat >= 0'); return; }
    setSaving(true);
    try {
      await api('/api/admin/models/' + editing.id, {
        method: 'PATCH', body: { credit_cost: c }
      });
      setEditing(null); setCost('');
      setMessage('Harga model diperbarui');
      load();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setSaving(false); }
  };

  return html`
    <div>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Kelola Models</h2>
        <p className="text-xs text-muted">${models.length} model AI terdaftar</p>
      </div>

      ${message && html`<div className="badge badge-success" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${message}</div>`}

      <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        ${models.map(m => html`
          <${Card} key=${m.id} style=${{ opacity: m.is_active ? 1 : 0.6 }}>
            <div className="flex justify-between items-center" style=${{ marginBottom: '12px' }}>
              <span className=${'badge badge-' + (m.type === 'chat' ? 'primary' : m.type === 'image' ? 'success' : 'warning')} style=${{ textTransform: 'capitalize' }}>
                ${m.type}
              </span>
              <span className=${'badge badge-' + (m.is_active ? 'success' : 'error')}>
                ${m.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <h3 style=${{ marginBottom: '4px' }}>${m.name}</h3>
            <p className="text-xs text-muted mono" style=${{ marginBottom: '16px' }}>${m.id} · ${m.provider}</p>

            <div className="flex justify-between items-center" style=${{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div>
                <div className="text-xs text-muted">Harga</div>
                <div style=${{ fontWeight: '600' }}>${m.credit_cost} Kredit</div>
              </div>
              <div className="flex gap-1">
                <${Button} size="sm" variant="secondary" onClick=${() => { setEditing(m); setCost(String(m.credit_cost)); }}>
                  <${Icons.Edit2} size=${14} />
                <//>
                <${Button} size="sm" variant=${m.is_active ? 'secondary' : 'primary'} onClick=${() => handleToggle(m)}>
                  ${m.is_active ? html`<${Icons.EyeOff} size=${14} />` : html`<${Icons.Eye} size=${14} />`}
                <//>
              </div>
            </div>
          <//>
        `)}
      </div>

      ${editing && html`
        <div style=${{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <${Card} style=${{ width: '100%', maxWidth: '400px' }}>
            <h3 style=${{ marginBottom: '8px' }}>Edit Harga Model</h3>
            <p className="text-sm text-muted" style=${{ marginBottom: '16px' }}>${editing.name}</p>
            <div style=${{ marginBottom: '16px' }}>
              <label className="label">Harga (Kredit)</label>
              <input className="input" type="number" min="0" value=${cost} onInput=${e => setCost(e.target.value)} />
            </div>
            <div className="flex gap-2" style=${{ justifyContent: 'flex-end' }}>
              <${Button} variant="secondary" onClick=${() => setEditing(null)} disabled=${saving}>Batal<//>
              <${Button} onClick=${handleSaveCost} disabled=${saving}>${saving ? 'Menyimpan...' : 'Simpan'}<//>
            </div>
          <//>
        </div>
      `}
    </div>
  `;
}