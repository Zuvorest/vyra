import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons, fmtIDR } from './ui.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { user, type: 'credit'|'balance' }
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    api('/api/admin/users').then(r => setUsers(r.data.users || [])).catch(e => setMessage('Error: ' + e.message));
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt < 1) { alert('Jumlah harus bilangan bulat >= 1'); return; }
    if (reason.trim().length < 3) { alert('Alasan minimal 3 karakter'); return; }
    setSubmitting(true);
    try {
      const path = modal.type === 'credit' ? '/api/admin/credits' : '/api/admin/balance';
      const body = modal.type === 'credit'
        ? { user_id: modal.user.id, amount: amt, reason: reason.trim() }
        : { user_id: modal.user.id, amount: amt, reason: reason.trim() };
      await api(path, { method: 'POST', body });
      setMessage(`✅ ${modal.type === 'credit' ? amt + ' kredit' : 'Rp ' + amt.toLocaleString('id-ID')} ditambahkan`);
      setModal(null); setAmount(''); setReason('');
      load();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { alert('Gagal: ' + err.message); }
    finally { setSubmitting(false); }
  };

  return html`
    <div>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Kelola Users</h2>
        <p className="text-xs text-muted">${users.length} pengguna terdaftar</p>
      </div>

      ${message && html`<div className="badge badge-success" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${message}</div>`}

      <div style=${{ marginBottom: '16px' }}>
        <input className="input" placeholder="Cari berdasarkan nama atau ID..."
          value=${search} onInput=${e => setSearch(e.target.value)} />
      </div>

      <${Card} style=${{ overflowX: 'auto' }}>
        <table style=${{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style=${{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style=${{ padding: '10px 8px' }}>User</th>
              <th style=${{ padding: '10px 8px' }}>Status</th>
              <th style=${{ padding: '10px 8px', textAlign: 'right' }}>Kredit</th>
              <th style=${{ padding: '10px 8px', textAlign: 'right' }}>Saldo</th>
              <th style=${{ padding: '10px 8px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(u => html`
              <tr key=${u.id} style=${{ borderBottom: '1px solid var(--border)' }}>
                <td style=${{ padding: '12px 8px' }}>
                  <div style=${{ fontWeight: '500' }}>${u.display_name || 'Tanpa Nama'}</div>
                  <div className="text-xs text-muted mono">${u.id.slice(0, 8)}...</div>
                </td>
                <td style=${{ padding: '12px 8px' }}>
                  <span className=${'badge badge-' + (u.status === 'active' ? 'success' : 'error')}>${u.status}</span>
                </td>
                <td style=${{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>${u.credits?.balance || 0}</td>
                <td style=${{ padding: '12px 8px', textAlign: 'right' }}>${fmtIDR(u.balance?.amount || 0)}</td>
                <td style=${{ padding: '12px 8px' }}>
                  <div className="flex gap-1" style=${{ flexWrap: 'wrap' }}>
                    <${Button} size="sm" variant="secondary" onClick=${() => setModal({ user: u, type: 'credit' })}>
                      <${Icons.Zap} size=${12} /> Kredit
                    <//>
                    <${Button} size="sm" variant="secondary" onClick=${() => setModal({ user: u, type: 'balance' })}>
                      <${Icons.Coins} size=${12} /> Saldo
                    <//>
                  </div>
                </td>
              </tr>
            `)}
            ${filtered.length === 0 && html`<tr><td colSpan="5" style=${{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada user.</td></tr>`}
          </tbody>
        </table>
      <//>

      ${modal && html`
        <div className="modal-overlay" onClick=${() => !submitting && setModal(null)}>
          <div className="modal" onClick=${e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>${modal.type === 'credit' ? 'Beri Kredit' : 'Beri Saldo'} — ${modal.user.display_name}</h3>
              <button className="icon-btn" onClick=${() => setModal(null)}><${Icons.X} size=${18} /></button>
            </div>
            <div className="modal-body">
              <div style=${{ marginBottom: '12px' }}>
                <label className="label">${modal.type === 'credit' ? 'Jumlah Kredit' : 'Jumlah Saldo (Rp)'}</label>
                <input className="input" type="number" min="1" value=${amount}
                  onInput=${e => setAmount(e.target.value)}
                  placeholder=${modal.type === 'credit' ? 'Misal: 50' : 'Misal: 50000'} />
              </div>
              <div style=${{ marginBottom: '16px' }}>
                <label className="label">Alasan (audit)</label>
                <input className="input" value=${reason}
                  onInput=${e => setReason(e.target.value)}
                  placeholder="Misal: Bonus kompensasi" />
              </div>
              <div className="flex gap-2" style=${{ justifyContent: 'flex-end' }}>
                <${Button} variant="secondary" onClick=${() => setModal(null)} disabled=${submitting}>Batal<//>
                <${Button} onClick=${handleSubmit} disabled=${submitting}>
                  ${submitting ? 'Memproses...' : 'Berikan'}
                <//>
              </div>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}