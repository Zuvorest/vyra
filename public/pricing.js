import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, Button, fmtIDR, EmptyState } from './ui.js';

export default function Pricing() {
  const [packages, setPackages] = useState([]);
  const [contact, setContact] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/api/pricing/packages'),
      api('/api/settings'),
      api('/api/user/me').catch(() => null),
    ]).then(([pk, ct, me]) => {
      setPackages(pk.data?.packages || []);
      setContact(ct.data || {});
      setUser(me?.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openBuy = (pkg) => setModal(pkg);

  const buildWaMessage = (pkg) => {
    const email = user?.auth?.email || '(email saya)';
    return encodeURIComponent(
      `Halo admin VYRA,\n\nSaya ingin membeli paket:\n` +
      `• ${pkg.name}\n` +
      `• ${pkg.base_credits}${pkg.bonus_credits > 0 ? ' + ' + pkg.bonus_credits + ' bonus' : ''} credits\n` +
      `• Harga: Rp ${pkg.price_idr.toLocaleString('id-ID')}\n\n` +
      `Akun saya: ${email}\n\nMohon dibantu proses pembayarannya. Terima kasih.`
    );
  };

  return html`
    <div>
      <${PageHeader}
        title="Plans & Pricing"
        subtitle="Beli paket kredit. Pembayaran dikonfirmasi manual oleh admin."
      />

      ${contact.payment_note && html`
        <${Card} style=${{ marginBottom: '16px', borderColor: 'var(--warning)' }}>
          <div style=${{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <${Icons.Info} size=${18} color="var(--warning)" style=${{ flexShrink: 0, marginTop: '2px' }} />
            <p className="text-sm" style=${{ color: 'var(--text-muted)' }}>${contact.payment_note}</p>
          </div>
        <//>
      `}

      ${loading && html`<div className="loading">Memuat paket...</div>`}

      ${!loading && packages.length === 0 && html`
        <${Card}>
          <${EmptyState} icon=${Icons.Package} title="Belum ada paket" description="Admin belum mengaktifkan paket kredit." />
        <//>
      `}

      ${!loading && packages.length > 0 && html`
        <div className="pkg-grid">
          ${packages.map(p => {
            const total = p.base_credits + p.bonus_credits;
            const perCredit = Math.round(p.price_idr / total);
            const isBest = p.badge === 'Best Value';
            return html`
              <div className=${'pkg-card ' + (isBest ? 'pkg-best' : '')} key=${p.id}>
                ${p.badge && html`<div className="pkg-badge">${p.badge}</div>`}
                <div className="pkg-name">${p.name}</div>
                <div className="pkg-price">${fmtIDR(p.price_idr)}</div>
                <div className="pkg-credits">
                  <span className="pkg-main">${p.base_credits} credits</span>
                  ${p.bonus_credits > 0 && html`<span className="pkg-bonus">+${p.bonus_credits} bonus</span>`}
                </div>
                <div className="pkg-total">${total} credits total</div>
                <div className="pkg-per">≈ ${fmtIDR(perCredit)} / credit</div>
                <${Button}
                  variant=${isBest ? 'primary' : 'secondary'}
                  style=${{ width: '100%', marginTop: '16px' }}
                  onClick=${() => openBuy(p)}
                >Beli Paket<//>
              </div>
            `;
          })}
        </div>
      `}

      ${modal && html`
        <div className="modal-overlay" onClick=${() => setModal(null)}>
          <div className="modal" onClick=${e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Beli ${modal.name}</h3>
              <button className="icon-btn" onClick=${() => setModal(null)}><${Icons.X} size=${18} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-summary">
                <div><span className="text-muted text-sm">Paket</span><strong>${modal.name}</strong></div>
                <div><span className="text-muted text-sm">Credits</span><strong>${modal.base_credits + modal.bonus_credits}</strong></div>
                <div><span className="text-muted text-sm">Harga</span><strong>${fmtIDR(modal.price_idr)}</strong></div>
              </div>

              <p className="text-sm text-muted" style=${{ margin: '16px 0' }}>
                Untuk menyelesaikan pembelian, hubungi admin melalui WhatsApp atau Instagram. Setelah pembayaran dikonfirmasi, admin akan menambahkan credits ke akun Anda.
              </p>

              ${!contact.contact_whatsapp && !contact.contact_instagram && html`
                <div className="badge badge-warning" style=${{ display: 'block', padding: '10px', marginBottom: '12px' }}>
                  ⚠️ Admin belum mengatur kontak. Silakan hubungi admin langsung.
                </div>
              `}

              <div className="modal-actions">
                ${contact.contact_whatsapp && html`
                  <a
                    className="btn btn-primary"
                    style=${{ flex: 1 }}
                    href=${'https://wa.me/' + contact.contact_whatsapp.replace(/\D/g, '') + '?text=' + buildWaMessage(modal)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <${Icons.MessageCircle} size=${16} /> WhatsApp
                  </a>
                `}
                ${contact.contact_instagram && html`
                  <a
                    className="btn btn-secondary"
                    style=${{ flex: 1 }}
                    href=${'https://instagram.com/' + contact.contact_instagram.replace('@','')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <${Icons.Instagram} size=${16} /> Instagram
                  </a>
                `}
              </div>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}