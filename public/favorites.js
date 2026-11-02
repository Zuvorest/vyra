import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, EmptyState } from './ui.js';

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api('/api/favorites')
      .then(r => setItems(r.data.favorites || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (toolId) => {
    try {
      await api('/api/favorites/' + toolId, { method: 'DELETE' });
      load();
    } catch (err) {
      alert('Gagal hapus: ' + err.message);
    }
  };

  return html`
    <div>
      <${PageHeader}
        title="Favorites"
        subtitle=${items.length + ' tools disimpan'}
      />

      ${loading && html`<div className="loading">Memuat...</div>`}

      ${!loading && items.length === 0 && html`
        <${Card}>
          <${EmptyState}
            icon=${Icons.Star}
            title="Belum ada favorit"
            description="Tandai tools favorit Anda dari halaman Explore Tools untuk akses cepat."
            action=${html`<${Link} to="/dashboard/tools" className="btn btn-primary">Explore Tools<//>`}
          />
        <//>
      `}

      ${!loading && items.length > 0 && html`
        <div className="tools-grid">
          ${items.map(t => html`
            <div className="tool-tile" key=${t.id}>
              <div className="tool-tile-top">
                <div className="tool-tile-icon"><${Icons.Wand2} size=${18} /></div>
                <button
                  className="icon-btn active"
                  onClick=${() => remove(t.id)}
                  title="Hapus dari favorit"
                >
                  <${Icons.Star} size=${16} fill="currentColor" />
                </button>
              </div>
              <h3 className="tool-tile-name">${t.name}</h3>
              <p className="tool-tile-desc">${t.description}</p>
              <div className="tool-tile-foot">
                <span className="tool-tile-cat">${t.category_id}</span>
                <span className="tool-tile-cost">
                  ${t.credit_cost != null ? html`<${Icons.Zap} size=${12} /> ${t.credit_cost}` : 'Free'}
                </span>
              </div>
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}
