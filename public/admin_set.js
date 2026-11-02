import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, Button, Input } from './ui.js';

export default function AdminSettings() {
  const [wa, setWa] = useState('');
  const [ig, setIg] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/settings').then(r => {
      setWa(r.data.contact_whatsapp || '');
      setIg(r.data.contact_instagram || '');
      setNote(r.data.payment_note || '');
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await Promise.all([
        api('/api/admin/settings', { method: 'POST', body: { key: 'contact_whatsapp', value: wa } }),
        api('/api/admin/settings', { method: 'POST', body: { key: 'contact_instagram', value: ig } }),
        api('/api/admin/settings', { method: 'POST', body: { key: 'payment_note', value: note } }),
      ]);
      setMsg('✅ Pengaturan disimpan');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  return html`
    <div style=${{ maxWidth: '700px' }}>
      <${PageHeader}
        title="Admin Settings"
        subtitle="Kontak pembayaran & catatan untuk halaman Pricing"
      />

      ${msg && html`<div className="badge badge-primary" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${msg}</div>`}

      <${Card}>
        <h3 style=${{ marginBottom: '16px' }}>Kontak Pembayaran</h3>
        <${Input}
          label="Nomor WhatsApp"
          hint="Format: 6281234567890 (tanpa + atau spasi)"
          value=${wa}
          onInput=${e => setWa(e.target.value)}
          placeholder="6281234567890"
        />
        <${Input}
          label="Username Instagram"
          hint="Tanpa @ — contoh: vyra"
          value=${ig}
          onInput=${e => setIg(e.target.value)}
          placeholder="vyra"
        />
        <div style=${{ marginBottom: '16px' }}>
          <label className="label">Catatan pembayaran</label>
          <textarea
            className="input"
            value=${note}
            onInput=${e => setNote(e.target.value)}
            rows="3"
            placeholder="Petunjuk pembayaran manual untuk user..."
          />
        </div>
        <${Button} onClick=${save} disabled=${saving}>
          <${Icons.Save} size=${16} /> ${saving ? 'Menyimpan...' : 'Simpan'}
        <//>
      <//>
    </div>
  `;
}