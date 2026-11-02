import { createElement } from 'https://esm.sh/react@18.3.1';
import htm from 'https://esm.sh/htm@3.1.1';
import * as Icons from 'https://esm.sh/lucide-react@0.453.0?deps=react@18.3.1';

const html = htm.bind(createElement);

export { html, Icons };

// ============ FORMATTERS ============
export const fmtNum = (n) => Number(n || 0).toLocaleString('id-ID');
export const fmtIDR = (n) => 'Rp ' + fmtNum(n);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
export const fmtDateTime = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
export const fmtRelative = (d) => {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return mins + ' menit lalu';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' jam lalu';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + ' hari lalu';
  return fmtDate(d);
};

// ============ BUTTON ============
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return html`
    <button className=${'btn btn-' + variant + ' ' + sizeClass + ' ' + className} ...${props}>
      ${children}
    </button>
  `;
}

// ============ CARD ============
export function Card({ children, className = '', padded = true, ...props }) {
  return html`
    <div className=${'card ' + (padded ? '' : 'card-flush ') + className} ...${props}>
      ${children}
    </div>
  `;
}

// ============ BADGE ============
export function Badge({ children, variant = 'default' }) {
  return html`<span className=${'badge badge-' + variant}>${children}</span>`;
}

// ============ INPUT ============
export function Input({ label, hint, error, ...props }) {
  return html`
    <div style=${{ marginBottom: '16px' }}>
      ${label && html`<label className="label">${label}</label>`}
      <input className=${'input ' + (error ? 'input-error' : '')} ...${props} />
      ${hint && !error && html`<p className="text-xs text-muted" style=${{ marginTop: '6px' }}>${hint}</p>`}
      ${error && html`<p className="text-xs" style=${{ marginTop: '6px', color: 'var(--error)' }}>${error}</p>`}
    </div>
  `;
}

// ============ PAGE HEADER ============
export function PageHeader({ title, subtitle, actions }) {
  return html`
    <div className="page-header">
      <div>
        <h1 className="page-title">${title}</h1>
        ${subtitle && html`<p className="page-subtitle">${subtitle}</p>`}
      </div>
      ${actions && html`<div className="page-actions">${actions}</div>`}
    </div>
  `;
}

// ============ STAT ============
export function Stat({ label, value, sub, icon: Icon, color = 'var(--primary)', hint }) {
  return html`
    <div className="stat-card" title=${hint || ''}>
      <div className="stat-top">
        <span className="stat-label">${label}</span>
        ${Icon && html`<div className="stat-icon" style=${{ color, background: 'color-mix(in srgb, ' + color + ' 12%, transparent)' }}>
          <${Icon} size=${16} />
        </div>`}
      </div>
      <div className="stat-value">${value}</div>
      ${sub && html`<div className="stat-sub">${sub}</div>`}
    </div>
  `;
}

// ============ TABS ============
export function Tabs({ items, active, onChange }) {
  return html`
    <div className="tabs" role="tablist">
      ${items.map(it => html`
        <button
          key=${it.key}
          role="tab"
          aria-selected=${active === it.key}
          className=${'tab ' + (active === it.key ? 'active' : '')}
          onClick=${() => onChange(it.key)}
        >
          ${it.icon && html`<${it.icon} size=${14} />`}
          ${it.label}
          ${it.count != null && html`<span className="tab-count">${it.count}</span>`}
        </button>
      `)}
    </div>
  `;
}

// ============ FILTER CHIP ============
export function FilterChip({ active, onClick, children }) {
  return html`
    <button className=${'filter-chip ' + (active ? 'active' : '')} onClick=${onClick}>
      ${children}
    </button>
  `;
}

// ============ EMPTY STATE ============
export function EmptyState({ icon: Icon = Icons.Inbox, title, description, action }) {
  return html`
    <div className="empty-state">
      <div className="empty-icon"><${Icon} size=${28} /></div>
      <h3 className="empty-title">${title}</h3>
      ${description && html`<p className="empty-desc">${description}</p>`}
      ${action && html`<div className="empty-action">${action}</div>`}
    </div>
  `;
}

// ============ SKELETON ============
export function Skeleton({ width = '100%', height = '14px', radius = '6px' }) {
  return html`<div className="skeleton" style=${{ width, height, borderRadius: radius }}></div>`;
}

// ============ PROGRESS BAR ============
export function ProgressBar({ value, max = 100, color = 'var(--primary)' }) {
  const pct = Math.min(100, (value / max) * 100);
  return html`
    <div className="progress">
      <div className="progress-fill" style=${{ width: pct + '%', background: color }}></div>
    </div>
  `;
}

// ============ BAR CHART ============
// data: [{label, value}]
export function BarChart({ data, color = 'var(--primary)', height = 140 }) {
  if (!data || data.length === 0) {
    return html`<div className="chart-empty">Tidak ada data untuk periode ini.</div>`;
  }
  const max = Math.max(...data.map(d => d.value), 1);
  return html`
    <div className="chart">
      <div className="chart-bars" style=${{ height: height + 'px' }}>
        ${data.map((d, i) => html`
          <div className="chart-col" key=${i} title=${d.label + ': ' + d.value}>
            <div className="chart-bar-wrap">
              <div
                className="chart-bar"
                style=${{ height: (d.value / max * 100) + '%', background: color }}
              ></div>
            </div>
            <div className="chart-bar-value">${d.value || ''}</div>
            <div className="chart-bar-label">${d.label}</div>
          </div>
        `)}
      </div>
    </div>
  `;
}

// ============ SPARKLINE ============
export function Sparkline({ data, color = 'var(--primary)', width = 100, height = 28 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  return html`
    <svg width=${width} height=${height} viewBox=${`0 0 ${width} ${height}`} style=${{ display: 'block' }}>
      <polyline fill="none" stroke=${color} stroke-width="1.5" points=${points} />
    </svg>
  `;
}