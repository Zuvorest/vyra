import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, EmptyState, fmtDateTime } from './ui.js';

export default function Creations() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/jobs?limit=50')
      .then(r => setJobs(r.data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s) => {
    if (s === 'completed') return 'badge-success';
    if (s === 'failed') return 'badge-error';
    return 'badge-warning';
  };

  return html`
    <div>
      <${PageHeader}
        title="My Creations"
        subtitle=${jobs.length + ' hasil dari job Anda'}
      />

      ${loading && html`<div className="loading">Memuat...</div>`}

      ${!loading && jobs.length === 0 && html`
        <${Card}>
          <${EmptyState}
            icon=${Icons.Image}
            title="Belum ada karya"
            description="Setiap kali Anda menjalankan AI Chat, Image, atau Video Studio, hasilnya akan muncul di sini."
            action=${html`
              <div className="flex gap-2">
                <${Link} to="/dashboard/image" className="btn btn-primary">Generate Image<//>
                <${Link} to="/dashboard/chat" className="btn btn-secondary">Start Chat<//>
              </div>
            `}
          />
        <//>
      `}

      ${!loading && jobs.length > 0 && html`
        <div className="creations-grid">
          ${jobs.map(j => html`
            <div className="creation-card" key=${j.id}>
              <div className="creation-thumb">
                <${j.type === 'chat' ? Icons.MessageSquare : j.type === 'image' ? Icons.Image : Icons.Video} size=${32} />
              </div>
              <div className="creation-body">
                <div className="creation-top">
                  <span className="creation-type">${j.type}</span>
                  <span className=${'badge ' + statusBadge(j.status)}>${j.status}</span>
                </div>
                <div className="creation-prompt">
                  ${j.input?.prompt ? String(j.input.prompt).slice(0, 100) : j.model_id}
                </div>
                <div className="creation-meta">
                  <span>${j.model_id}</span>
                  <span>·</span>
                  <span>${j.credit_cost} credits</span>
                </div>
                <div className="creation-time">${fmtDateTime(j.created_at)}</div>
              </div>
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}