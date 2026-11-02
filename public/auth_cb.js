import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons } from './ui.js';

export default function AuthCallback() {
  const [status, setStatus] = useState('Memproses login...');
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (!access_token || !refresh_token) {
          // Cek juga query param (untuk error case)
          const queryParams = new URLSearchParams(window.location.search);
          const err = queryParams.get('error_description') || 'Token tidak ditemukan.';
          setError(err);
          return;
        }

        setStatus('Menyimpan sesi...');
        await api('/api/auth/set-session', {
          method: 'POST',
          body: { access_token, refresh_token },
        });

        setStatus('Berhasil! Mengalihkan...');
        // Cek next param dari query
        const queryParams = new URLSearchParams(window.location.search);
        const next = queryParams.get('next');
        const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
        setTimeout(() => { window.location.href = safe; }, 400);
      } catch (err) {
        setError(err.message);
      }
    };
    run();
  }, []);

  return html`
    <div className="flex items-center justify-center" style=${{ minHeight: '100vh', padding: '16px' }}>
      <div className="card" style=${{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <img src="/image/logo.png" alt="VYRA" style=${{ height: '40px', marginBottom: '20px' }}
          onError=${e => e.target.style.display='none'} />
        ${error
          ? html`
              <div className="badge badge-error" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${error}</div>
              <a href="/login" className="btn btn-primary" style=${{ width: '100%' }}>Kembali ke Login</a>
            `
          : html`
              <${Icons.Loader2} className="spin" size=${24} style=${{ margin: '0 auto 16px', color: 'var(--primary)' }} />
              <p className="text-muted text-sm">${status}</p>
            `}
      </div>
    </div>
  `;
}