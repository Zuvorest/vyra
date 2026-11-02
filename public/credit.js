
import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Card, Button, Icons } from './ui.js';

export default function Credit() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [rate, setRate] = useState(100);
  const [convertCredits, setConvertCredits] = useState('');
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = () => {
    Promise.all([
      api('/api/user/me'),
      api('/api/credit/history'),
      api('/api/credit/info')
    ]).then(([userRes, histRes, infoRes]) => {
      setData(userRes.data);
      setHistory(histRes.data.history || []);
      setRate(infoRes.data.rate || 100);
    }).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  const handleConvert = async () => {
    const credits = Number(convertCredits);
    if (!Number.isInteger(credits) || credits < 1) {
      alert('Masukkan jumlah kredit yang valid (bilangan bulat positif)');
      return;
    }
    const cost = credits * rate;
    if (cost > (data.balance.amount || 0)) {
      alert('Saldo tidak cukup. Butuh Rp ' + cost.toLocaleString('id-ID'));
      return;
    }
    if (!confirm(`Tukar Rp ${cost.toLocaleString('id-ID')} saldo menjadi ${credits} kredit?`)) return;

    setConverting(true);
    setMessage('');
    try {
      const res = await api('/api/credit/convert', {
        method: 'POST',
        body: { credits }
      });
      setMessage(`✅ Berhasil! ${credits} kredit ditambahkan. Saldo tersisa Rp ${res.data.new_balance.toLocaleString('id-ID')}`);
      setConvertCredits('');
      loadData();
      window.dispatchEvent(new Event('refresh-user'));
    } catch (err) {
      setMessage('❌ Gagal: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  if (!data) return html`<div className="loading">Memuat...</div>`;

  const currentBalance = data.balance.amount || 0;
  const wantedCredits = Number(convertCredits) || 0;
  const convertCost = wantedCredits * rate;
  const canConvert = wantedCredits >= 1 && convertCost <= currentBalance && !converting;

  return html`
    <div style=${{ maxWidth: '900px', margin: '0 auto' }}>
      <div style=${{ marginBottom: '24px' }}>
        <h2 style=${{ fontSize: '20px', marginBottom: '4px' }}>Credits & Balance</h2>
        <p className="text-xs text-muted">Kelola kredit AI, saldo uang, dan konversi di antara keduanya.</p>
      </div>

      ${message && html`
        <div className="badge badge-primary" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>
          ${message}
        </div>
      `}

      <div style=${{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <${Card}>
          <div className="flex justify-between items-center" style=${{ marginBottom: '16px' }}>
            <span className="text-sm text-muted">Kredit AI</span>
            <${Icons.Zap} size=${20} color="var(--primary)" />
          </div>
          <h2 style=${{ fontSize: '32px' }}>${data.credits}</h2>
        <//>

        <${Card}>
          <div className="flex justify-between items-center" style=${{ marginBottom: '16px' }}>
            <span className="text-sm text-muted">Saldo Uang</span>
            <${Icons.Wallet} size=${20} color="var(--success)" />
          </div>
          <h2 style=${{ fontSize: '32px' }}>Rp ${currentBalance.toLocaleString('id-ID')}</h2>
        <//>
      </div>

      <${Card} style=${{ marginBottom: '24px' }}>
        <div className="flex justify-between items-center" style=${{ marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <h3>Konversi Saldo → Kredit</h3>
          <span className="badge badge-primary">Rate: Rp ${rate.toLocaleString('id-ID')} = 1 Kredit</span>
        </div>
        <p className="text-sm text-muted" style=${{ marginBottom: '16px' }}>
          Tukar saldo uang Anda menjadi kredit AI yang bisa dipakai untuk chat, image, dan video.
        </p>

        <div style=${{ display: 'grid', gap: '12px' }}>
          <div>
            <label className="label">Jumlah Kredit yang Diinginkan</label>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value=${convertCredits}
                onInput=${e => setConvertCredits(e.target.value)}
                placeholder="Contoh: 50"
                style=${{ flex: 1 }}
              />
              <${Button} variant="secondary" size="sm"
                onClick=${() => setConvertCredits(String(Math.floor(currentBalance / rate)))}>
                Max
              <//>
            </div>
          </div>

          ${wantedCredits > 0 && html`
            <div style=${{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Biaya konversi:</span>
                <strong>Rp ${convertCost.toLocaleString('id-ID')}</strong>
              </div>
              <div className="flex justify-between text-sm" style=${{ marginTop: '6px' }}>
                <span className="text-muted">Saldo saat ini:</span>
                <span>Rp ${currentBalance.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm" style=${{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                <span className="text-muted">Saldo setelah konversi:</span>
                <strong style=${{ color: convertCost > currentBalance ? 'var(--error)' : 'var(--success)' }}>
                  Rp ${Math.max(0, currentBalance - convertCost).toLocaleString('id-ID')}
                </strong>
              </div>
            </div>
          `}

          ${wantedCredits > 0 && convertCost > currentBalance && html`
            <div className="badge badge-error" style=${{ padding: '10px' }}>
              Saldo tidak cukup. Butuh tambahan Rp ${(convertCost - currentBalance).toLocaleString('id-ID')}.
            </div>
          `}

          <${Button}
            onClick=${handleConvert}
            disabled=${!canConvert}
            style=${{ width: '100%' }}
          >
            ${converting
              ? 'Memproses...'
              : html`<${Icons.ArrowRightLeft} size=${16} /> Konversi ${wantedCredits > 0 ? wantedCredits + ' Kredit' : 'Sekarang'}`}
          <//>
        </div>
      <//>

      <${Card}>
        <h3 style=${{ marginBottom: '16px' }}>Riwayat Kredit</h3>
        <div style=${{ overflowX: 'auto' }}>
          <table style=${{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style=${{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style=${{ padding: '8px' }}>Tanggal</th>
                <th style=${{ padding: '8px' }}>Alasan</th>
                <th style=${{ padding: '8px', textAlign: 'right' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(h => html`
                <tr key=${h.id} style=${{ borderBottom: '1px solid var(--border)' }}>
                  <td style=${{ padding: '12px 8px' }}>${new Date(h.created_at).toLocaleDateString('id-ID')}</td>
                  <td style=${{ padding: '12px 8px', textTransform: 'capitalize' }}>${(h.reason || '-').replace(/_/g, ' ')}</td>
                  <td style=${{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: h.amount > 0 ? 'var(--success)' : 'var(--text)' }}>
                    ${h.amount > 0 ? '+' : ''}${h.amount}
                  </td>
                </tr>
              `)}
              ${history.length === 0 && html`<tr><td colSpan="3" style=${{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada riwayat.</td></tr>`}
            </tbody>
          </table>
        </div>
      <//>
    </div>
  `;
}