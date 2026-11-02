import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function AdminLogs() {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [trx, setTrx] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/logs').then(r => setLogs(r.data.logs || [])).catch(e => setError(e.message));
    api('/api/admin/transactions?limit=100').then(r => setTrx(r.data.transactions || [])).catch(e => setError(e.message));
  }, []);

  return html`
    <div>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Log & Transaksi</h2>
        <p className="text-xs text-muted">Jejak audit dan semua transaksi platform.</p>
      </div>

      ${error && html`<div className="badge badge-error" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${error}</div>`}

      <div className="flex gap-2" style=${{ marginBottom: '16px' }}>
        <${Button} variant=${tab === 'logs' ? 'primary' : 'secondary'} size="sm" onClick=${() => setTab('logs')}>
          <${Icons.FileText} size=${14} /> Audit Log (${logs.length})
        <//>
        <${Button} variant=${tab === 'trx' ? 'primary' : 'secondary'} size="sm" onClick=${() => setTab('trx')}>
          <${Icons.Receipt} size=${14} /> Transaksi (${trx.length})
        <//>
      </div>

      ${tab === 'logs' && html`
        <${Card} style=${{ overflowX: 'auto' }}>
          ${logs.length === 0 ? html`<p className="text-muted text-sm">Belum ada log.</p>` : html`
            <table style=${{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style=${{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style=${{ padding: '8px' }}>Waktu</th>
                  <th style=${{ padding: '8px' }}>Aksi</th>
                  <th style=${{ padding: '8px' }}>Target</th>
                  <th style=${{ padding: '8px' }}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => html`
                  <tr key=${l.id} style=${{ borderBottom: '1px solid var(--border)' }}>
                    <td style=${{ padding: '10px 8px', fontSize: '11px' }}>${new Date(l.created_at).toLocaleString('id-ID')}</td>
                    <td style=${{ padding: '10px 8px' }}><span className="badge badge-primary">${l.action}</span></td>
                    <td style=${{ padding: '10px 8px', fontSize: '11px' }} className="mono">
                      ${l.target_type ? l.target_type + ':' + (l.target_id || '').slice(0, 8) : '-'}
                    </td>
                    <td style=${{ padding: '10px 8px', fontSize: '11px' }} className="mono">
                      ${JSON.stringify(l.metadata || {}).slice(0, 60)}
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
        <//>
      `}

      ${tab === 'trx' && html`
        <${Card} style=${{ overflowX: 'auto' }}>
          ${trx.length === 0 ? html`<p className="text-muted text-sm">Belum ada transaksi.</p>` : html`
            <table style=${{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style=${{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style=${{ padding: '8px' }}>Waktu</th>
                  <th style=${{ padding: '8px' }}>User</th>
                  <th style=${{ padding: '8px' }}>Tipe</th>
                  <th style=${{ padding: '8px', textAlign: 'right' }}>Jumlah</th>
                  <th style=${{ padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                ${trx.map(t => html`
                  <tr key=${t.id} style=${{ borderBottom: '1px solid var(--border)' }}>
                    <td style=${{ padding: '10px 8px', fontSize: '11px' }}>${new Date(t.created_at).toLocaleString('id-ID')}</td>
                    <td style=${{ padding: '10px 8px', fontSize: '11px' }} className="mono">${t.user_id.slice(0, 8)}...</td>
                    <td style=${{ padding: '10px 8px', textTransform: 'capitalize' }}>${t.type}</td>
                    <td style=${{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>Rp ${t.amount.toLocaleString('id-ID')}</td>
                    <td style=${{ padding: '10px 8px' }}>
                      <span className=${'badge badge-' + (t.status === 'success' ? 'success' : t.status === 'failed' ? 'error' : 'warning')}>
                        ${t.status}
                      </span>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
        <//>
      `}
    </div>
  `;
}