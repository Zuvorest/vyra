import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [data, setData] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api('/api/user/me').then(res => setData(res.data)).catch(() => {});
  }, []);

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.className = newTheme;
    localStorage.setItem('theme', newTheme);
  };

  const handleLogout = async () => {
    if (!confirm('Keluar dari akun VYRA?')) return;
    setLoggingOut(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      alert('Gagal logout: ' + err.message);
      setLoggingOut(false);
    }
  };

  return html`
    <div style=${{ maxWidth: '700px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Settings</h2>
        <p className="text-xs text-muted">Preferensi dan keamanan akun.</p>
      </div>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '16px' }}>Tampilan</h3>
        <div className="text-sm text-muted" style=${{ marginBottom: '12px' }}>Pilih tema aplikasi.</div>
        <div className="flex gap-2">
          <${Button} 
            variant=${theme === 'dark' ? 'primary' : 'secondary'} 
            onClick=${() => applyTheme('dark')}
          >
            <${Icons.Moon} size=${16} /> Gelap
          <//>
          <${Button} 
            variant=${theme === 'light' ? 'primary' : 'secondary'} 
            onClick=${() => applyTheme('light')}
          >
            <${Icons.Sun} size=${16} /> Terang
          <//>
        </div>
      <//>

      <${Card} style=${{ marginBottom: '16px' }}>
        <h3 style=${{ marginBottom: '16px' }}>Informasi Sesi</h3>
        <div style=${{ display: 'grid', gap: '12px', fontSize: '14px' }}>
          <div className="flex justify-between" style=${{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-muted">Email</span>
            <span>${data?.auth?.email || '...'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Metode Autentikasi</span>
            <span>Cookie HttpOnly (aman dari XSS)</span>
          </div>
        </div>
      <//>

      <${Card}>
        <h3 style=${{ marginBottom: '8px' }}>Keluar</h3>
        <p className="text-sm text-muted" style=${{ marginBottom: '16px' }}>
          Mengakhiri sesi Anda di browser ini. Anda perlu login ulang untuk mengakses dashboard.
        </p>
        <${Button} variant="danger" onClick=${handleLogout} disabled=${loggingOut}>
          <${Icons.LogOut} size=${16} /> ${loggingOut ? 'Keluar...' : 'Logout'}
        <//>
      <//>
    </div>
  `;
}