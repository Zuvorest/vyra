import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, Button, Stat, PageHeader, EmptyState, BarChart, fmtNum, fmtIDR, fmtRelative, fmtDate } from './ui.js';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [trans, setTrans] = useState([]);
  const [tools, setTools] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(7); // 7 / 30 / 90

  useEffect(() => {
    Promise.all([
      api('/api/user/me'),
      api('/api/credit/history?limit=100'),
      api('/api/balance/transactions?limit=10'),
      api('/api/tools?featured=true&limit=6'),
      api('/api/models').catch(() => ({ data: { models: [] } })),
    ])
      .then(([u, h, t, tl, m]) => {
        setUser(u.data);
        setHistory(h.data?.history || []);
        setTrans(t.data?.transactions || []);
        setTools(tl.data?.tools || []);
        setModels(m.data?.models || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return html`<div className="loading">Memuat dashboard...</div>`;
  if (!user) return html`<${EmptyState} icon=${Icons.AlertCircle} title="Gagal memuat" description="Coba refresh halaman." />`;

  // Compute metrics
  const negatives = history.filter(h => h.amount < 0);
  const positives = history.filter(h => h.amount > 0);
  const totalUsed = negatives.reduce((s, h) => s + Math.abs(h.amount), 0);
  const totalPurchased = positives
    .filter(h => /package|topup|admin_grant/.test(h.reason))
    .reduce((s, h) => s + h.amount, 0);
  const bonusCredits = positives
    .filter(h => /bonus|admin_grant/.test(h.reason))
    .reduce((s, h) => s + h.amount, 0);

  const credits = user.credits || 0;
  const balance = user.balance?.amount || 0;

  // Chart data — bucket credits usage by day for range
  const chartData = (() => {
    const buckets = {};
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }
    negatives.forEach(h => {
      const key = new Date(h.created_at).toISOString().slice(0, 10);
      if (key in buckets) buckets[key] += Math.abs(h.amount);
    });
    const entries = Object.entries(buckets);
    // If 90 days, sample weekly labels to avoid clutter
    if (range === 90) {
      return entries.filter((_, i) => i % 7 === 0).map(([d, v]) => ({ label: new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), value: v }));
    }
    return entries.map(([d, v]) => ({
      label: new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      value: v,
    }));
  })();

  const periodTotal = chartData.reduce((s, d) => s + d.value, 0);

  // Category breakdown — from credit_history reason + models map
  const modelTypeMap = Object.fromEntries(models.map(m => [m.id, m.type]));
  const categories = { chat: 0, image: 0, video: 0, other: 0 };
  negatives.forEach(h => {
    const m = h.reason?.match(/^job_(.+)$/);
    if (m) {
      const type = modelTypeMap[m[1]];
      if (type && type in categories) categories[type] += Math.abs(h.amount);
      else categories.other += Math.abs(h.amount);
    } else {
      categories.other += Math.abs(h.amount);
    }
  });
  const catTotal = Object.values(categories).reduce((s, v) => s + v, 0);

  const categoryMeta = [
    { key: 'chat', label: 'AI Chat', color: 'var(--primary)' },
    { key: 'image', label: 'Image', color: 'var(--success)' },
    { key: 'video', label: 'Video', color: 'var(--warning)' },
    { key: 'other', label: 'Other', color: 'var(--text-muted)' },
  ];

  // Recent activity — merge credit history + transactions, sort desc
  const activity = [
    ...history.slice(0, 10).map(h => ({
      id: 'c-' + h.id,
      title: (h.reason || '-').replace(/_/g, ' ').replace(/^job /, ''),
      category: h.reason?.startsWith('job_') ? 'AI Job' : h.reason?.startsWith('package') ? 'Package' : 'Credit',
      date: h.created_at,
      amount: h.amount,
      status: 'success',
      kind: 'credit',
    })),
    ...trans.slice(0, 5).map(t => ({
      id: 't-' + t.id,
      title: (t.type || '').replace(/_/g, ' '),
      category: 'Transaction',
      date: t.created_at,
      amount: null,
      rupiah: t.amount,
      status: t.status,
      kind: 'trx',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  // Insights
  const topCategory = categoryMeta
    .map(c => ({ ...c, value: categories[c.key] || 0 }))
    .sort((a, b) => b.value - a.value)[0];

  return html`
    <div className="dash">
      <!-- Welcome -->
      <div className="dash-welcome">
        <div>
          <div className="dash-greet">${greeting()},</div>
          <h1 className="dash-welcome-title">${user.profile?.display_name || user.auth.email.split('@')[0]}</h1>
          <p className="dash-welcome-sub">Your creative workspace, all in one place.</p>
        </div>
        <div className="dash-quick">
          <${Link} to="/dashboard/chat" className="quick-btn">
            <${Icons.MessageSquare} size=${16} />
            <span>Start a Chat</span>
          <//>
          <${Link} to="/dashboard/image" className="quick-btn">
            <${Icons.Image} size=${16} />
            <span>Generate Image</span>
          <//>
          <${Link} to="/dashboard/tools" className="quick-btn">
            <${Icons.Boxes} size=${16} />
            <span>Explore Tools</span>
          <//>
        </div>
      </div>

      <!-- Balance grid -->
      <div className="dash-balance-grid">
        <${Stat}
          label="Credit Balance"
          value=${fmtNum(credits)}
          sub="credits available"
          icon=${Icons.Zap}
          color="var(--primary)"
        />
        <${Stat}
          label="Rupiah Balance"
          value=${fmtIDR(balance)}
          sub="wallet balance"
          icon=${Icons.Wallet}
          color="var(--success)"
        />
        <${Stat}
          label="Total Used"
          value=${fmtNum(totalUsed)}
          sub="credits across all jobs"
          icon=${Icons.TrendingDown}
          color="var(--warning)"
        />
        <${Stat}
          label="Total Purchased"
          value=${fmtNum(totalPurchased)}
          sub=${bonusCredits > 0 ? `+ ${fmtNum(bonusCredits)} bonus` : 'from packages & top-ups'}
          icon=${Icons.TrendingUp}
          color="var(--text)"
        />
      </div>

      <!-- Usage analytics -->
      <${Card} style=${{ marginBottom: '16px' }}>
        <div className="panel-head">
          <div>
            <h3 className="panel-title">Usage Analytics</h3>
            <p className="panel-sub">Credits consumed over time</p>
          </div>
          <div className="period-pills">
            ${[7, 30, 90].map(d => html`
              <button
                key=${d}
                className=${'period-pill ' + (range === d ? 'active' : '')}
                onClick=${() => setRange(d)}
              >${d}d</button>
            `)}
          </div>
        </div>
        <div className="chart-stat-row">
          <div>
            <div className="chart-stat-label">Periode terakhir ${range} hari</div>
            <div className="chart-stat-value">${fmtNum(periodTotal)}</div>
            <div className="chart-stat-sub">credits used</div>
          </div>
        </div>
        <${BarChart} data=${chartData} height=${140} />
      </${Card}>

      <!-- Two-column: Category + Insights -->
      <div className="dash-two-col">
        <${Card}>
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Usage by Category</h3>
              <p className="panel-sub">Distribution across tool types</p>
            </div>
          </div>
          ${catTotal === 0
            ? html`<${EmptyState} icon=${Icons.PieChart} title="Belum ada penggunaan" description="Jalankan AI job pertama Anda untuk melihat distribusi kategori." />`
            : html`
              <div className="cat-list">
                ${categoryMeta.map(c => {
                  const v = categories[c.key] || 0;
                  const pct = catTotal > 0 ? (v / catTotal * 100) : 0;
                  return html`
                    <div className="cat-row" key=${c.key}>
                      <div className="cat-row-top">
                        <div className="cat-row-label">
                          <span className="cat-dot" style=${{ background: c.color }}></span>
                          ${c.label}
                        </div>
                        <div className="cat-row-value">${fmtNum(v)} <span className="text-muted text-xs">(${pct.toFixed(0)}%)</span></div>
                      </div>
                      <div className="progress">
                        <div className="progress-fill" style=${{ width: pct + '%', background: c.color }}></div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            `}
        </${Card}>

        <${Card}>
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Quick Insights</h3>
              <p className="panel-sub">Ringkasan aktivitas Anda</p>
            </div>
          </div>
          <div className="insights">
            <div className="insight-item">
              <div className="insight-icon"><${Icons.BarChart3} size=${16} /></div>
              <div>
                <div className="insight-label">Kategori utama</div>
                <div className="insight-value">${topCategory.value > 0 ? topCategory.label : 'Belum ada'}</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon"><${Icons.Activity} size=${16} /></div>
              <div>
                <div className="insight-label">Total job</div>
                <div className="insight-value">${fmtNum(negatives.length)} jobs</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon"><${Icons.Receipt} size=${16} /></div>
              <div>
                <div className="insight-label">Transaksi</div>
                <div className="insight-value">${fmtNum(trans.length)}</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-icon"><${Icons.Coins} size=${16} /></div>
              <div>
                <div className="insight-label">Rata-rata per job</div>
                <div className="insight-value">${negatives.length > 0 ? fmtNum(Math.round(totalUsed / negatives.length)) : 0} kredit</div>
              </div>
            </div>
          </div>
        </${Card}>
      </div>

      <!-- Recent activity -->
      <${Card} style=${{ marginBottom: '16px' }}>
        <div className="panel-head">
          <div>
            <h3 className="panel-title">Recent Activity</h3>
            <p className="panel-sub">Latest jobs dan transaksi</p>
          </div>
          <${Link} to="/dashboard/usage" className="panel-link">Lihat semua <${Icons.ArrowRight} size=${12} /><//>
        </div>
        ${activity.length === 0
          ? html`<${EmptyState} icon=${Icons.Activity} title="Belum ada aktivitas" description="Mulai dengan AI Chat atau Image Studio untuk melihat riwayat di sini." />`
          : html`
            <div className="activity-list">
              ${activity.map(a => html`
                <div className="activity-row" key=${a.id}>
                  <div className="activity-kind">
                    ${a.kind === 'trx' ? html`<${Icons.Receipt} size=${14} />` : html`<${Icons.Zap} size=${14} />`}
                  </div>
                  <div className="activity-main">
                    <div className="activity-title">${a.title}</div>
                    <div className="activity-meta">${a.category} · ${fmtRelative(a.date)}</div>
                  </div>
                  <div className="activity-amount">
                    ${a.kind === 'credit'
                      ? html`<span className=${a.amount > 0 ? 'amount-pos' : 'amount-neg'}>${a.amount > 0 ? '+' : ''}${a.amount}</span>`
                      : html`<span className="amount-neutral">${fmtIDR(a.rupiah)}</span>`}
                  </div>
                  <div className="activity-status">
                    <span className=${'badge badge-' + (a.status === 'success' ? 'success' : a.status === 'failed' ? 'error' : 'warning')}>
                      ${a.status || 'ok'}
                    </span>
                  </div>
                </div>
              `)}
            </div>
          `}
      </${Card}>

      <!-- Two-column: Favorites + Models -->
      <div className="dash-two-col">
        <${Card}>
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Featured Tools</h3>
              <p className="panel-sub">Direkomendasikan untuk Anda</p>
            </div>
            <${Link} to="/dashboard/tools" className="panel-link">Semua <${Icons.ArrowRight} size=${12} /><//>
          </div>
          ${tools.length === 0
            ? html`<${EmptyState} icon=${Icons.Box} title="Katalog kosong" description="Belum ada tools featured." />`
            : html`
              <div className="mini-tools">
                ${tools.slice(0, 4).map(t => html`
                  <${Link} to="/dashboard/tools" className="mini-tool" key=${t.id}>
                    <div className="mini-tool-icon"><${Icons.Wand2} size=${16} /></div>
                    <div className="mini-tool-body">
                      <div className="mini-tool-name">${t.name}</div>
                      <div className="mini-tool-meta">
                        ${t.credit_cost != null ? t.credit_cost + ' credits' : 'Free'}
                        <span className=${'mini-dot ' + (t.status === 'active' ? 'live' : 'soon')}></span>
                        <span className="text-muted">${t.status === 'active' ? 'Live' : t.status === 'beta' ? 'Beta' : 'Soon'}</span>
                      </div>
                    </div>
                  <//>
                `)}
              </div>
            `}
        </${Card}>

        <${Card}>
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Model Spotlight</h3>
              <p className="panel-sub">AI models available</p>
            </div>
            <${Link} to="/dashboard/models" className="panel-link">Semua <${Icons.ArrowRight} size=${12} /><//>
          </div>
          ${models.length === 0
            ? html`<${EmptyState} icon=${Icons.Box} title="Belum ada model" description="Katalog model akan muncul di sini." />`
            : html`
              <div className="mini-tools">
                ${models.slice(0, 4).map(m => html`
                  <div className="mini-tool" key=${m.id}>
                    <div className="mini-tool-icon"><${Icons.Cpu} size=${16} /></div>
                    <div className="mini-tool-body">
                      <div className="mini-tool-name">${m.name}</div>
                      <div className="mini-tool-meta">
                        ${m.credit_cost} credits
                        <span className="mini-dot live"></span>
                        <span className="text-muted">${m.type}</span>
                      </div>
                    </div>
                  </div>
                `)}
              </div>
            `}
        </${Card}>
      </div>
    </div>
  `;
}