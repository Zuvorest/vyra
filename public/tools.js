
import { useState, useEffect, useRef } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, EmptyState, Button, Skeleton } from './ui.js';

const STATUS_LABELS = { active: 'Live', beta: 'Beta', coming_soon: 'Soon' };

export default function Tools() {
  const [data, setData] = useState({ tools: [], categories: [], subcategories: [] });
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [manualCollapsed, setManualCollapsed] = useState(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    Promise.all([
      api('/api/tools?limit=300'),
      api('/api/favorites').catch(() => ({ data: { favorites: [] } })),
    ]).then(([t, f]) => {
      setData({
        tools: t.data.tools || [],
        categories: t.data.categories || [],
        subcategories: t.data.subcategories || [],
      });
      setFavorites(new Set((f.data.favorites || []).map(x => x.id)));
    }).finally(() => setLoading(false));
  }, []);
useEffect(() => {
  if (loading || initialized.current) return;
  // Biarkan kosong (tertutup semua) saat pertama kali masuk
  setExpanded(new Set());
  initialized.current = true;
}, [loading, data]);

  const toggleFav = async (id) => {
    if (favorites.has(id)) {
      await api('/api/favorites/' + id, { method: 'DELETE' }).catch(() => {});
      setFavorites(prev => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      await api('/api/favorites/' + id, { method: 'POST' }).catch(() => {});
      setFavorites(prev => new Set(prev).add(id));
    }
  };

  const toggleCat = (catId) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(catId)) {
        n.delete(catId);
        setManualCollapsed(m => new Set(m).add(catId));
      } else {
        n.add(catId);
        setManualCollapsed(m => { const x = new Set(m); x.delete(catId); return x; });
      }
      return n;
    });
  };

  const q = search.trim().toLowerCase();
  const matches = (t) => !q ||
    (t.name || '').toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q) ||
    (t.slug || '').toLowerCase().includes(q);

  const categoriesWithTools = data.categories
    .map(cat => {
      const catTools = data.tools.filter(t => t.category_id === cat.id && matches(t));
      const subs = data.subcategories.filter(s => s.category_id === cat.id);
      const groupedBySub = {};
      const ungrouped = [];

      catTools.forEach(t => {
        if (t.subcategory_id) {
          groupedBySub[t.subcategory_id] = groupedBySub[t.subcategory_id] || [];
          groupedBySub[t.subcategory_id].push(t);
        } else {
          ungrouped.push(t);
        }
      });

      const subGroups = subs
        .map(s => ({ sub: s, tools: groupedBySub[s.id] || [] }))
        .filter(g => g.tools.length > 0);

      return { cat, total: catTools.length, subGroups, ungrouped };
    })
    .filter(g => g.total > 0 || !q);

  useEffect(() => {
    if (!q) return;
    const auto = new Set();
    categoriesWithTools.forEach(g => { if (g.total > 0) auto.add(g.cat.id); });
    setExpanded(auto);
  }, [q]);

  const expandAll = () => {
    const all = new Set(data.categories.map(c => c.id));
    setExpanded(all);
    setManualCollapsed(new Set());
  };
  const collapseAll = () => {
    setExpanded(new Set());
    setManualCollapsed(new Set(data.categories.map(c => c.id)));
  };

  const totalVisible = categoriesWithTools.reduce((s, g) => s + g.total, 0);

  return html`
    <div>
      <${PageHeader}
        title="VYRA.AI"
        subtitle=${loading ? 'Memuat...' : `${data.categories.length} kategori · ${data.tools.length} tools`}
        actions=${html`
          <div className="flex gap-2">
            <${Button} variant="secondary" size="sm" onClick=${expandAll}>Expand semua</${Button}>
            <${Button} variant="secondary" size="sm" onClick=${collapseAll}>Collapse</${Button}>
          </div>
        `}
      />

      <${Card} style=${{ marginBottom: '16px' }}>
        <div className="search-wrap" style=${{ maxWidth: '100%' }}>
          <${Icons.Search} size=${16} className="search-icon" />
          <input
            className="input search-input"
            placeholder="Cari fitur berdasarkan nama, deskripsi, atau slug..."
            value=${search}
            onInput=${e => setSearch(e.target.value)}
          />
        </div>
        ${q && html`<div className="text-xs text-muted" style=${{ marginTop: '8px' }}>
          ${totalVisible} hasil untuk "${search}"
        </div>`}
      <//>

      ${loading && html`
        <div style=${{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          ${[1,2,3,4,5].map(i => html`<${Card} key=${i}><${Skeleton} height="60px" /><//>`)}
        </div>
      `}

      ${!loading && data.tools.length === 0 && html`
        <${Card}>
          <${EmptyState}
            icon=${Icons.Boxes}
            title="Belum ada tools"
            description="Admin belum mempublikasikan tools. Tambahkan file di /sdcard/vyra/ai/ lalu publish dari Feature Builder."
          />
        <//>
      `}

      ${!loading && data.tools.length > 0 && categoriesWithTools.length === 0 && html`
        <${Card}>
          <${EmptyState}
            icon=${Icons.SearchX}
            title="Tidak ada hasil"
            description=${`Tidak ada fitur yang cocok dengan "${search}"`}
          />
        <//>
      `}

      ${!loading && html`
        <div className="cat-accordion">
          ${categoriesWithTools.map(g => {
            const isOpen = expanded.has(g.cat.id);
            const cat = g.cat;
            const totalInCat = data.tools.filter(t => t.category_id === cat.id).length;
            return html`
              <div className=${'cat-item ' + (isOpen ? 'open' : '')} key=${cat.id}>
                <button className="cat-head" onClick=${() => toggleCat(cat.id)}>
                  <div className="cat-head-left">
                    <${Icons.ChevronRight} size=${16} className="cat-chevron" />
                    <div>
                      <div className="cat-title">${cat.name}</div>
                      ${cat.description && html`<div className="cat-desc">${cat.description}</div>`}
                    </div>
                  </div>
                  <div className="cat-head-right">
                    <span className="cat-count">
                      ${q ? g.total + ' / ' : ''}${totalInCat} tools
                    </span>
                  </div>
                </button>

                ${isOpen && html`
                  <div className="cat-body">
                    ${g.total === 0 && html`
                      <div className="cat-empty">Belum ada tools di kategori ini.</div>
                    `}

                    ${g.subGroups.map(sg => html`
                      <div className="subcat-group" key=${sg.sub.id}>
                        <div className="subcat-label">
                          <${Icons.FolderOpen} size=${12} /> ${sg.sub.name}
                        </div>
                        <div className="tool-list">
                          ${sg.tools.map(t => html`
                            <${ToolRow} key=${t.id} tool=${t} isFav=${favorites.has(t.id)} onToggleFav=${toggleFav} />
                          `)}
                        </div>
                      </div>
                    `)}

                    ${g.ungrouped.length > 0 && html`
                      <div className="subcat-group">
                        ${g.subGroups.length > 0 && html`
                          <div className="subcat-label">
                            <${Icons.Layers} size=${12} /> Lainnya
                          </div>
                        `}
                        <div className="tool-list">
                          ${g.ungrouped.map(t => html`
                            <${ToolRow} key=${t.id} tool=${t} isFav=${favorites.has(t.id)} onToggleFav=${toggleFav} />
                          `)}
                        </div>
                      </div>
                    `}
                  </div>
                `}
              </div>
            `;
          })}
        </div>
      `}
    </div>
  `;
}

function ToolRow({ tool, isFav, onToggleFav }) {
  const statusLabel = STATUS_LABELS[tool.status] || tool.status;
  const statusVariant = tool.status === 'active' ? 'success' : tool.status === 'beta' ? 'warning' : 'primary';
  const isClickable = tool.status === 'active' || tool.status === 'beta';
  const href = '/dashboard/tools/' + tool.category_id + '/' + (tool.slug || tool.id);

  const body = html`
    <div className="tool-row-icon"><${Icons.Wand2} size=${16} /></div>
    <div className="tool-row-body">
      <div className="tool-row-name">
        ${tool.name}
        ${tool.label && html`<span className="badge badge-primary" style=${{ marginLeft: '6px' }}>${tool.label}</span>`}
      </div>
      ${tool.description && html`<div className="tool-row-desc">${tool.description}</div>`}
    </div>
    <div className="tool-row-cost">
      ${tool.credit_cost != null && tool.credit_cost > 0
        ? html`<span className="tool-cost-pill"><${Icons.Zap} size=${11} /> ${tool.credit_cost}</span>`
        : html`<span className="tool-cost-pill free">Free</span>`}
    </div>
    <span className=${'badge badge-' + statusVariant} style=${{ flexShrink: 0 }}>${statusLabel}</span>
    <button
      className=${'icon-btn ' + (isFav ? 'active' : '')}
      onClick=${(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(tool.id); }}
    >
      <${Icons.Star} size=${14} fill=${isFav ? 'currentColor' : 'none'} />
    </button>
  `;

  if (!isClickable) return html`<div className="tool-row disabled">${body}</div>`;
  return html`<${Link} to=${href} className="tool-row">${body}<//>`;
}
