import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, EmptyState, Button, fmtRelative } from './ui.js';

const TYPE_ICONS = {
  job_completed: Icons.CheckCircle,
  job_failed: Icons.XCircle,
  topup_success: Icons.Wallet,
  credit_grant: Icons.Zap,
  balance_grant: Icons.Coins,
  system: Icons.Bell,
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api('/api/notifications')
      .then(r => setItems(r.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const markOne = async (id) => {
    await api('/api/notifications/' + id + '/read', { method: 'POST' });
    load();
    window.dispatchEvent(new Event('refresh-notif'));
  };

  const markAll = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    load();
    window.dispatchEvent(new Event('refresh-notif'));
  };

  const unread = items.filter(i => !i.read_at).length;

  return html`
    <div>
      <${PageHeader}
        title="Notifications"
        subtitle=${unread > 0 ? unread + ' belum dibaca' : 'Semua sudah dibaca'}
        actions=${unread > 0 && html`<${Button} variant="secondary" onClick=${markAll}>Tandai semua dibaca<//>`}
      />

      ${loading && html`<div className="loading">Memuat notifikasi...</div>`}

      ${!loading && items.length === 0 && html`
        <${Card}>
          <${EmptyState}
            icon=${Icons.Bell}
            title="Belum ada notifikasi"
            description="Notifikasi tentang job, transaksi, dan akun akan muncul di sini."
          />
        <//>
      `}

      ${!loading && items.length > 0 && html`
        <${Card} padded=${false}>
          <div className="notif-list">
            ${items.map(n => {
              const Icon = TYPE_ICONS[n.type] || Icons.Bell;
              const body = html`
                <div className="notif-icon"><${Icon} size=${18} /></div>
                <div className="notif-main">
                  <div className="notif-title">${n.title}</div>
                  ${n.message && html`<div className="notif-msg">${n.message}</div>`}
                  <div className="notif-time">${fmtRelative(n.created_at)}</div>
                </div>
              `;
              const handleClick = () => { if (!n.read_at) markOne(n.id); };
              return html`
                <div
                  key=${n.id}
                  className=${'notif-row ' + (!n.read_at ? 'unread' : '')}
                  onClick=${handleClick}
                >
                  ${n.link
                    ? html`<${Link} to=${n.link} className="notif-inner" onClick=${handleClick}>${body}<//>`
                    : html`<div className="notif-inner">${body}</div>`}
                  ${!n.read_at && html`<span className="notif-badge"></span>`}
                </div>
              `;
            })}
          </div>
        <//>
      `}
    </div>
  `;
}