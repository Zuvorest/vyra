import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Icons } from './ui.js';

export default function ExploreModels() {
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api('/api/models').then(res => setModels(res.data.models)).catch(console.error);
  }, []);

  const filtered = models.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.provider.toLowerCase().includes(search.toLowerCase())
  );

  return html`
    <div style=${{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex justify-between items-center" style=${{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Explore Models</h2>
          <p className="text-xs text-muted">Jelajahi katalog AI yang tersedia.</p>
        </div>
        <div style=${{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <input className="input" placeholder="Cari model atau provider..." value=${search} onInput=${e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        ${filtered.map(m => html`
          <${Card} key=${m.id} className="card-hover">
            <div className="flex justify-between items-center" style=${{ marginBottom: '12px' }}>
              <div className="badge badge-primary" style=${{ textTransform: 'capitalize' }}>${m.type}</div>
              <span className="text-xs text-muted mono">${m.provider}</span>
            </div>
            <h3 style=${{ marginBottom: '8px' }}>${m.name}</h3>
            <p className="text-sm text-muted" style=${{ marginBottom: '16px' }}>ID: <span className="mono">${m.id}</span></p>
            <div className="flex justify-between items-center" style=${{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <span className="text-sm font-semibold"><${Icons.Zap} size=${14} style=${{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--primary)' }} /> ${m.credit_cost} Kredit</span>
              <span className="badge badge-success">Aktif</span>
            </div>
          <//>
        `)}
      </div>
    </div>
  `;
}