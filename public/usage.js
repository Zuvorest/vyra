import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

const safeStr = (v) => (v == null ? '-' : String(v));
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const safeDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID');
};

export default function Usage() {
  const [tab, setTab] = useState('credit');
  const [creditHistory, setCreditHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/credit/history?limit=50')
      .then(r => setCreditHistory(r.data?.history || []))
      .catch(e => setError(e.message));
    api('/api/balance/transactions?limit=50')
      .then(r => setTransactions(r.data?.transactions || []))
      .catch(e => setError(e.message));
  }, []);

  return html`
    <div style=${{ maxWidth: '900px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Usage History</h2>
        <p className="text-xs text-muted">Riwayat penggunaan kredit dan transaksi saldo.</p>
      </div>

      ${error && html`<div className="badge badge-error" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${error}</div>`}

      <div className="flex gap-2" style=${{ marginBottom: '16px' }}>
        <${Button} variant=${tab === 'credit' ? 'primary' : 'secondary'} size="sm" onClick=${() => setTab('credit')}>
          <${Icons.Zap} size=${14} /> Riwayat Kredit (${creditHistory.length})
        <//>
        <${Button} variant=${tab === 'transaction' ? 'primary' : 'secondary'} size="sm" onClick=${() => setTab('transaction')}>
          <${Icons.Wallet} size=${14} /> Transaksi Saldo (${transactions.length})
        <//>
      </div>

      ${tab === 'credit' && html`
        <${Card}>
          ${creditHistory.length === 0 
            ? html`<p className="text-muted text-sm">Belum ada riwayat kredit. Jalankan AI job atau top-up untuk melihat riwayat.</p>`
            : html`
              <div style=${{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                ${creditHistory.map(h => html`
                  <div key=${h.id} style=${{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style=${{ fontWeight: '500', textTransform: 'capitalize' }}>
                        ${safeStr(h.reason).replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-muted">
                        ${safeDate(h.created_at)} · Ref: <span className="mono">${safeStr(h.ref_id)}</span>
                      </div>
                    </div>
                    <span style=${{ 
                      fontWeight: '700', fontSize: '16px',
                      color: safeNum(h.amount) > 0 ? 'var(--success)' : 'var(--text)'
                    }}>
                      ${safeNum(h.amount) > 0 ? '+' : ''}${safeNum(h.amount)}
                    </span>
                  </div>
                `)}
              </div>
            `}
        <//>
      `}

      ${tab === 'transaction' && html`
        <${Card}>
          ${transactions.length === 0 
            ? html`<p className="text-muted text-sm">Belum ada transaksi.</p>`
            : html`
              <div style=${{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                ${transactions.map(t => html`
                  <div key=${t.id} style=${{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style=${{ fontWeight: '500', textTransform: 'capitalize' }}>${safeStr(t.type)}</div>
                      <div className="text-xs text-muted">${safeDate(t.created_at)} · ${safeStr(t.provider)}</div>
                    </div>
                    <div style=${{ textAlign: 'right' }}>
                      <div style=${{ fontWeight: '700' }}>Rp ${safeNum(t.amount).toLocaleString('id-ID')}</div>
                      <span className=${'badge badge-' + (t.status === 'success' ? 'success' : t.status === 'failed' ? 'error' : 'warning')}>
                        ${safeStr(t.status)}
                      </span>
                    </div>
                  </div>
                `)}
              </div>
            `}
        <//>
      `}
    </div>
  `;
}