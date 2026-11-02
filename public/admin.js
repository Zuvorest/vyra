import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Card, Icons } from './ui.js';

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/stats').then(r => setStats(r.data)).catch(e => setError(e.message));
  }, []);

  if (error) {
    return html`<div className="badge badge-error" style=${{ display: 'block', padding: '12px' }}>${error}</div>`;
  }
  if (!stats) return html`<div className="loading">Memuat statistik...</div>`;

  const cards = [
    { label: 'Total Users', value: stats.users, icon: Icons.Users, color: 'var(--primary)', link: '/dashboard/admin/users' },
    { label: 'Jobs Completed', value: stats.jobs.completed, icon: Icons.CheckCircle, color: 'var(--success)', link: '/dashboard/admin/logs' },
    { label: 'Jobs Pending', value: stats.jobs.pending, icon: Icons.Clock, color: 'var(--warning)', link: '/dashboard/admin/logs' },
    { label: 'Jobs Failed', value: stats.jobs.failed, icon: Icons.XCircle, color: 'var(--error)', link: '/dashboard/admin/logs' },
    { label: 'Kredit Beredar', value: Number(stats.credits_in_system).toLocaleString('id-ID'), icon: Icons.Zap, color: 'var(--primary)', link: '/dashboard/admin/users' },
    { label: 'Saldo Beredar', value: 'Rp ' + Number(stats.balance_in_system).toLocaleString('id-ID'), icon: Icons.Wallet, color: 'var(--success)', link: '/dashboard/admin/logs' },
  ];

  return html`
    <div>
      <div style=${{ marginBottom: '24px' }}>
        <div className="badge badge-warning" style=${{ marginBottom: '8px' }}>
          <${Icons.Shield} size=${14} /> Admin Mode
        </div>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Admin Overview</h2>
        <p className="text-xs text-muted">Statistik platform secara keseluruhan.</p>
      </div>

      <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        ${cards.map(c => html`
          <${Link} to=${c.link} key=${c.label} style=${{ textDecoration: 'none', color: 'inherit' }}>
            <${Card} className="card-hover">
              <div className="flex justify-between items-center" style=${{ marginBottom: '12px' }}>
                <span className="text-sm text-muted">${c.label}</span>
                <${c.icon} size=${20} color=${c.color} />
              </div>
              <div style=${{ fontSize: '24px', fontWeight: '600' }}>${c.value}</div>
            <//>
          <//>
        `)}
      </div>

      <${Card}>
        <h3 style=${{ marginBottom: '16px' }}>Quick Actions</h3>
        <div className="flex gap-2" style=${{ flexWrap: 'wrap' }}>
          <${Link} to="/dashboard/admin/users" className="btn btn-primary"><${Icons.Users} size=${16} /> Kelola Users<//>
          <${Link} to="/dashboard/admin/models" className="btn btn-secondary"><${Icons.Box} size=${16} /> Kelola Models<//>
          <${Link} to="/dashboard/admin/logs" className="btn btn-secondary"><${Icons.FileText} size=${16} /> Audit Log<//>
        </div>
      <//>
    </div>
  `;
}