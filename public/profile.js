import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function Profile() {
  const [data, setData] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    api('/api/user/me').then(res => {
      setData(res.data);
      setDisplayName(res.data.profile.display_name || '');
      setAvatarUrl(res.data.profile.avatar_url || '');
    }).catch(e => setMessage({ type: 'error', text: e.message }));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const body = {};
      if (displayName.trim()) body.display_name = displayName.trim();
      if (avatarUrl.trim()) body.avatar_url = avatarUrl.trim();

      if (Object.keys(body).length === 0) {
        setMessage({ type: 'error', text: 'Tidak ada perubahan untuk disimpan.' });
        setSaving(false);
        return;
      }

      await api('/api/user/profile', { method: 'PATCH', body });
      setMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
      window.dispatchEvent(new Event('refresh-user'));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return html`<div className="loading">Memuat profil...</div>`;
  }

  const initial = (data.profile.display_name || data.auth.email || '?')[0].toUpperCase();

  return html`
    <div style=${{ maxWidth: '700px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Profile</h2>
        <p className="text-xs text-muted">Kelola informasi akun Anda.</p>
      </div>

      ${message.text && html`
        <div className=${'badge badge-' + (message.type === 'error' ? 'error' : 'success')} 
          style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>
          ${message.text}
        </div>
      `}

      <${Card} style=${{ marginBottom: '16px' }}>
        <div className="flex items-center gap-4" style=${{ marginBottom: '24px' }}>
          ${data.profile.avatar_url 
            ? html`<img src=${data.profile.avatar_url} alt="avatar" style=${{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} onError=${e => e.target.style.display='none'} />`
            : html`<div style=${{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700' }}>${initial}</div>`
          }
          <div>
            <h3 style=${{ marginBottom: '4px' }}>${data.profile.display_name || 'Tanpa Nama'}</h3>
            <p className="text-sm text-muted">${data.auth.email}</p>
          </div>
        </div>

        <form onSubmit=${handleSave}>
          <div style=${{ marginBottom: '16px' }}>
            <label className="label">Display Name</label>
            <input 
              className="input" 
              value=${displayName} 
              onInput=${e => setDisplayName(e.target.value)}
              placeholder="Nama yang ditampilkan"
              maxLength="80"
            />
          </div>

          <div style=${{ marginBottom: '16px' }}>
            <label className="label">Avatar URL (opsional)</label>
            <input 
              className="input" 
              value=${avatarUrl} 
              onInput=${e => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/foto.jpg"
              type="url"
            />
            <p className="text-xs text-muted" style=${{ marginTop: '6px' }}>Tempel URL gambar publik untuk dijadikan avatar.</p>
          </div>

          <${Button} type="submit" disabled=${saving}>
            ${saving ? 'Menyimpan...' : html`<${Icons.Save} size=${16} /> Simpan Perubahan`}
          <//>
        </form>
      <//>

      <${Card}>
        <h3 style=${{ marginBottom: '16px' }}>Informasi Akun</h3>
        <div style=${{ display: 'grid', gap: '12px', fontSize: '14px' }}>
          <div className="flex justify-between" style=${{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-muted">ID Pengguna</span>
            <span className="mono text-xs">${data.auth.id}</span>
          </div>
          <div className="flex justify-between" style=${{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-muted">Role</span>
            <span style=${{ textTransform: 'capitalize', fontWeight: '500' }}>${data.auth.role}</span>
          </div>
          <div className="flex justify-between" style=${{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <span className="text-muted">Status Akun</span>
            <span className="badge badge-success" style=${{ textTransform: 'capitalize' }}>${data.profile.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Terdaftar Sejak</span>
            <span>${new Date(data.auth.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      <//>
    </div>
  `;
}