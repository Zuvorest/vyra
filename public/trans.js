import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, EmptyState, FilterChip, fmtIDR, fmtDateTime, Skeleton } from './ui.js';

export default function Transactions() {
  const [trans, setTrans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');

  useEffect(() => {
    api('/api/balance/transactions?limit=100')
      .then(r => setTrans(r.data?.transactions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = status === 'all' ? trans : trans.filter(t => t.status === status);
  const totalIn = trans.filter(t => t.status === 'success').reduce((s, t) => s + t.amount, 0);

  return html`
    <div>
      <${PageHeader}
        title="Transactions"
        subtitle=${fmtIDR(totalIn) + ' total transaksi sukses'}
      />

      <${Card} style=${{ marginBottom: '16px' }}>
        <div className="filter-chips">
          <${FilterChip} active=${status === 'all'} onClick=${() => setStatus('all')}>Semua<//>
          <${FilterChip} active=${status === 'success'} onClick=${() => setStatus('success')}>Success<//>
          <${FilterChip} active=${status === 'pending'} onClick=${() => setStatus('pending')}>Pending<//>
          <${FilterChip} active=${status === 'failed'} onClick=${() => setStatus('failed')}>Failed<//>
        </div>
      </${Card}>

      ${loading && html`<${Card}><${Skeleton} height="200px" /><//>`}

      ${!loading && visible.length === 0 && html`
        <${Card}>
          <${EmptyState}
            icon=${Icons.Receipt}
            title="Belum ada transaksi"
            description="Transaksi top-up dan pembelian paket akan muncul di sini."
          />
        <//>
      `}

      ${!loading && visible.length > 0 && html`
        <${Card} padded=${false}>
          <div className="trx-list">
            ${visible.map(t => html`
              <div className="trx-row" key=${t.id}>
                <div className="trx-icon">
                  ${t.type === 'topup' ? html`<${Icons.ArrowDownToLine} size=${16} />` : html`<${Icons.ArrowUpRight} size=${16} />`}
                </div>
                <div className="trx-main">
                  <div className="trx-title">${(t.type || '').replace(/_/g, ' ')}</div>
                  <div className="trx-meta">${fmtDateTime(t.created_at)} · ${t.provider || 'internal'}</div>
                </div>
                <div className="trx-amount">${fmtIDR(t.amount)}</div>
                <span className=${'badge badge-' + (t.status === 'success' ? 'success' : t.status === 'failed' ? 'error' : 'warning')}>
                  ${t.status}
                </span>
              </div>
            `)}
          </div>
        <//>
      `}
    </div>
  `;
}