import { useState } from 'https://esm.sh/react@18.3.1';
import { html, Card, Button, Icons } from './ui.js';

function CodeBlock({ code, lang = 'bash' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return html`
    <div style=${{ position: 'relative', marginTop: '12px' }}>
      <pre style=${{ 
        background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius)',
        fontSize: '13px', overflowX: 'auto', border: '1px solid var(--border)',
        fontFamily: 'Geist Mono, monospace', lineHeight: '1.5'
      }}><code>${code}</code></pre>
      <button onClick=${copy} className="btn btn-secondary btn-sm" style=${{ position: 'absolute', top: '8px', right: '8px' }}>
        <${Icons.Copy} size=${14} /> ${copied ? 'Tersalin' : 'Salin'}
      </button>
    </div>
  `;
}

export default function Docs() {
  const baseUrl = window.location.origin;

  return html`
    <div style=${{ maxWidth: '900px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>API Documentation</h2>
        <p className="text-xs text-muted">Panduan menggunakan Developer API VYRA.</p>
      </div>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>Introduction</h3>
        <p className="text-sm text-muted">
          Developer API memungkinkan Anda menjalankan AI job dari aplikasi Anda sendiri menggunakan API Key.
          Semua endpoint mengembalikan JSON dengan struktur: <code className="mono">{ '{ success, data, error, message }' }</code>.
        </p>
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>Authentication</h3>
        <p className="text-sm text-muted" style=${{ marginBottom: '8px' }}>
          Kirim API Key pada header <code className="mono">Authorization</code> dengan format <code className="mono">Bearer &lt;API_KEY&gt;</code>.
        </p>
        <${CodeBlock} code=${'Authorization: Bearer zy_live_xxxxxxxxxxxx'} />
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>Base URL</h3>
        <${CodeBlock} code=${baseUrl} />
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>POST /api/v1/jobs</h3>
        <p className="text-sm text-muted" style=${{ marginBottom: '8px' }}>Buat AI job baru.</p>
        <div className="text-xs text-muted" style=${{ marginBottom: '8px' }}>Body:</div>
        <${CodeBlock} code=${'{\n  "model_id": "gpt-4o",\n  "input": { "prompt": "Halo dunia" }\n}'} />
        <div className="text-xs text-muted" style=${{ marginTop: '12px', marginBottom: '8px' }}>cURL:</div>
        <${CodeBlock} code=${'curl -X POST ' + baseUrl + '/api/v1/jobs \\\n  -H "Authorization: Bearer zy_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d \'{"model_id":"gpt-4o","input":{"prompt":"Halo"}}\''} />
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>GET /api/jobs/:id</h3>
        <p className="text-sm text-muted" style=${{ marginBottom: '8px' }}>Lihat status dan hasil job (butuh cookie login, bukan API key).</p>
        <${CodeBlock} code=${'curl ' + baseUrl + '/api/jobs/&lt;job-id&gt; \\\n  -b cookies.txt'} />
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>GET /api/models</h3>
        <p className="text-sm text-muted" style=${{ marginBottom: '8px' }}>Daftar model AI aktif (publik, tanpa auth).</p>
        <${CodeBlock} code=${'curl ' + baseUrl + '/api/models'} />
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '8px' }}>Error Codes</h3>
        <div className="text-sm" style=${{ display: 'grid', gap: '8px' }}>
          <div><code className="mono">UNAUTHORIZED</code> — API key tidak valid / sudah dicabut (401)</div>
          <div><code className="mono">VALIDATION_ERROR</code> — Input tidak valid (400)</div>
          <div><code className="mono">CREDIT_FAILED</code> — Kredit tidak cukup (400)</div>
          <div><code className="mono">MODEL_NOT_FOUND</code> — Model tidak tersedia (404)</div>
          <div><code className="mono">TOO_MANY_REQUESTS</code> — Rate limit (429)</div>
        </div>
      <//>

      <${Card}>
        <h3 style=${{ marginBottom: '8px' }}>Rate Limits</h3>
        <div className="text-sm" style=${{ display: 'grid', gap: '8px' }}>
          <div>Global: <strong>120 req/menit</strong></div>
          <div>Jobs: <strong>30 req/menit</strong></div>
          <div>API Key management: <strong>10 req/menit</strong></div>
          <div>Auth (login/register): <strong>20 req/15 menit</strong></div>
        </div>
      <//>
    </div>
  `;
}