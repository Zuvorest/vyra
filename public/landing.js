
import { createElement, useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import * as Icons from 'https://esm.sh/lucide-react@0.453.0?deps=react@18.3.1';
import htm from 'https://esm.sh/htm@3.1.1';
import { api } from './api.js';

const html = htm.bind(createElement);

// ===================== BANNER =====================
function Banner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return html`
    <div className="lb-banner">
      <div className="lb-banner-inner">
        <span className="lb-banner-dot"></span>
        <span><strong>VYRA</strong> now in early access — AI Character Chat, Image Studio, and Audio Studio are officially live!</span>
        <a href="#tools" className="lb-banner-link">Explore tools <${Icons.ArrowRight} size=${12} /></a>
        <button className="lb-banner-close" aria-label="Tutup" onClick=${() => setOpen(false)}>
          <${Icons.X} size=${14} />
        </button>
      </div>
    </div>
  `;
}

// ===================== HEADER =====================
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const links = [
    { href: '#tools', label: 'Tools' },
    { href: '#models', label: 'Models' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#developers', label: 'Developers' },
    { href: '#compare', label: 'Compare' },
    { href: '#faq', label: 'FAQ' },
  ];
  return html`
    <header className=${'lb-header ' + (scrolled ? 'lb-header-scrolled' : '')}>
      <div className="lb-header-inner">
        <${Link} to="/" className="lb-logo">
          <img src="/image/logo.png" alt="VYRA" onError=${(e) => { e.target.style.display = 'none'; }} />
          <span>VYRA<span className="lb-logo-dot">.AI</span></span>
        <//>
        <nav className="lb-nav">
          ${links.map(l => html`<a href=${l.href} key=${l.href}>${l.label}</a>`)}
        </nav>
        <div className="lb-header-actions">
          <${Link} to="/login" className="lb-btn lb-btn-ghost">Login<//>
          <${Link} to="/login?next=/dashboard" className="lb-btn lb-btn-primary">Get Started<//>
        </div>
        <button className="lb-hamburger" aria-label="Menu" onClick=${() => setOpen(!open)}>
          ${open ? html`<${Icons.X} size=${20} />` : html`<${Icons.Menu} size=${20} />`}
        </button>
      </div>
      ${open && html`
        <div className="lb-mobile-menu">
          ${links.map(l => html`<a href=${l.href} key=${l.href} onClick=${() => setOpen(false)}>${l.label}</a>`)}
          <div className="lb-mobile-actions">
            <${Link} to="/login" className="lb-btn lb-btn-secondary" style=${{ flex: 1 }}>Login<//>
            <${Link} to="/login?next=/dashboard" className="lb-btn lb-btn-primary" style=${{ flex: 1 }}>Get Started<//>
          </div>
        </div>
      `}
    </header>
  `;
}

// ===================== HERO =====================
function Hero() {
  return html`
    <section className="lb-hero">
      <div className="lb-container">
        <div className="lb-hero-grid">
          <div className="lb-hero-copy">
            <div className="lb-eyebrow"><span className="lb-pulse"></span><span>Early Access · v0.1</span></div>
            <h1 className="lb-hero-title">
              One platform.<br />
              Every digital <em>tool</em>.
            </h1>
            <p className="lb-hero-sub">
              Ngobrol dengan karakter AI, buat gambar dari teks, atau ubah teks jadi suara realistis. Semua dalam satu workspace dengan satu saldo universal. Bayar sesuai yang kamu pakai.
            </p>
            <div className="lb-hero-ctas">
              <${Link} to="/login?next=/dashboard" className="lb-btn lb-btn-primary lb-btn-lg">
                Start Building <${Icons.ArrowRight} size=${16} />
              <//>
              <a href="#tools" className="lb-btn lb-btn-secondary lb-btn-lg">Explore Tools</a>
            </div>
            <div className="lb-hero-meta">
              <span><${Icons.Check} size=${14} /> Free starter credits</span>
              <span><${Icons.Check} size=${14} /> Pay-as-you-go</span>
            </div>
          </div>
          <div className="lb-hero-preview-wrap">
            <div className="lb-hero-preview">
              <div className="lb-preview-badge">Preview</div>
              <div className="lb-preview-header">
                <div className="lb-preview-model">
                  <span className="lb-preview-dot"></span><span>Elisa AI</span><${Icons.ChevronDown} size=${12} />
                </div>
                <div className="lb-preview-tabs">
                  <span className="active">Chat</span><span>Image</span><span>Audio</span>
                </div>
              </div>
              <div className="lb-preview-body">
                <div className="lb-preview-msg-user">Bikin gambar pemandangan gunung, lalu bacain puisi pakai suara kamu dong!</div>
                <div className="lb-preview-msg-ai">
                  <div className="lb-preview-meta"><span>VYRA Engine</span><span>·</span><span>7 credits</span></div>
                  <div className="lb-preview-response">Siap! Aku udah bikin gambar gunung yang indah banget. Nanti suara puisinya aku kirim lewat voice note ya!</div>
                </div>
              </div>
              <div className="lb-preview-input"><span>Ask anything...</span><${Icons.Send} size=${16} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ===================== TRUST =====================
function Trust() {
  const items = [
    { icon: Icons.Layers, label: 'One workspace', text: 'AI chat, image, and audio in one place.' },
    { icon: Icons.Coins, label: 'One balance', text: 'Pay across every tool from a single wallet.' },
    { icon: Icons.Box, label: 'Model catalog', text: 'Pick the right AI for the task.' },
    { icon: Icons.Code2, label: 'Developer API', text: 'Bearer-token access for your apps.' },
  ];
  return html`
    <section className="lb-trust">
      <div className="lb-container">
        <div className="lb-trust-grid">
          ${items.map(it => html`
            <div className="lb-trust-item" key=${it.label}>
              <${it.icon} size=${16} className="lb-trust-icon" />
              <div>
                <div className="lb-trust-label">${it.label}</div>
                <div className="lb-trust-text">${it.text}</div>
              </div>
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}

// ===================== TOOLS (REAL-TIME DARI DB) =====================
function Tools() {
  const [data, setData] = useState({ tools: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    // API ini otomatis mengambil data dari Feature Builder (hanya yang published)
    api('/api/tools?limit=50')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const catById = Object.fromEntries((data.categories || []).map(c => [c.id, c]));
  const visible = activeCat === 'all' ? data.tools : data.tools.filter(t => t.category_id === activeCat);

  const statusLabel = (s) => {
    if (s === 'active') return { text: 'Live', cls: 'badge-success' };
    if (s === 'beta') return { text: 'Beta', cls: 'badge-warning' };
    return { text: 'Coming soon', cls: 'badge-primary' };
  };

  return html`
    <section id="tools" className="lb-section">
      <div className="lb-container">
        <div className="lb-section-head">
          <div>
            <div className="lb-eyebrow"><span>Catalog</span></div>
            <h2 className="lb-title">One platform. Many tools.</h2>
            <p className="lb-lead">AI chat, image generation, dan audio tools — dikelompokkan berdasarkan kebutuhanmu. Fitur baru ditambahkan secara berkala.</p>
          </div>
        </div>

        <div className="lb-filters">
          <button className=${'lb-filter ' + (activeCat === 'all' ? 'active' : '')} onClick=${() => setActiveCat('all')}>
            <${Icons.LayoutGrid} size=${14} /> All
            <span className="lb-filter-count">${data.tools.length}</span>
          </button>
          ${(data.categories || []).map(c => {
            const count = data.tools.filter(t => t.category_id === c.id).length;
            return html`
              <button key=${c.id}
                className=${'lb-filter ' + (activeCat === c.id ? 'active' : '')}
                onClick=${() => setActiveCat(c.id)}>
                ${c.name}
                <span className="lb-filter-count">${count}</span>
              </button>
            `;
          })}
        </div>

        ${loading && html`<div className="lb-loading">Memuat tools...</div>`}

        ${!loading && visible.length === 0 && html`
          <div className="lb-empty">Belum ada tools di kategori ini.</div>
        `}

        ${!loading && visible.length > 0 && html`
          <div className="lb-tools-grid">
            ${visible.map(t => {
              const st = statusLabel(t.status);
              const cat = catById[t.category_id];
              return html`
                <div className="lb-tool-card" key=${t.id}>
                  <div className="lb-tool-top">
                    <span className="lb-tool-cat">${cat ? cat.name : t.category_id}</span>
                    <span className=${'badge ' + st.cls}>${st.text}</span>
                  </div>
                  <h3 className="lb-tool-name">${t.name}</h3>
                  <p className="lb-tool-desc">${t.description}</p>
                  <div className="lb-tool-foot">
                    ${t.credit_cost != null
                      ? html`<span className="lb-tool-cost"><${Icons.Zap} size=${12} /> ${t.credit_cost} credits</span>`
                      : html`<span className="lb-tool-cost"><${Icons.Sparkles} size=${12} /> Free / TBD</span>`}
                    <span className="lb-tool-link">
                      ${t.status === 'active' ? 'Open' : 'Preview'} <${Icons.ArrowRight} size=${12} />
                    </span>
                  </div>
                </div>
              `;
            })}
          </div>
        `}

        <div className="lb-models-foot">
          <${Link} to="/login?next=/dashboard" className="lb-btn lb-btn-secondary">
            Open full catalog <${Icons.ArrowRight} size=${14} />
          <//>
        </div>
      </div>
    </section>
  `;
}

// ===================== MODELS (REAL-TIME DARI DB) =====================
function Models() {
  const [models, setModels] = useState([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    api('/api/models').then(r => setModels(r.data.models || [])).catch(() => {});
  }, []);
  const types = ['all', 'chat', 'image', 'audio', 'video'];
  const visible = filter === 'all' ? models : models.filter(m => m.type === filter);

  return html`
    <section id="models" className="lb-section lb-section-alt">
      <div className="lb-container">
        <div className="lb-section-head">
          <div>
            <div className="lb-eyebrow"><span>AI Models</span></div>
            <h2 className="lb-title">The right model for the job.</h2>
            <p className="lb-lead">Semua model AI yang aktif di VYRA, lengkap dengan biaya kredit per-job yang transparan.</p>
          </div>
        </div>

        <div className="lb-filters">
          ${types.map(k => html`
            <button key=${k}
              className=${'lb-filter ' + (filter === k ? 'active' : '')}
              onClick=${() => setFilter(k)}>
              ${k === 'all' ? 'All' : (k.charAt(0).toUpperCase() + k.slice(1))}
              <span className="lb-filter-count">
                ${k === 'all' ? models.length : models.filter(m => m.type === k).length}
              </span>
            </button>
          `)}
        </div>

        <div className="lb-models-grid">
          ${visible.map(m => html`
            <div className="lb-model-card" key=${m.id}>
              <div className="lb-model-top">
                <span className=${'lb-model-type lb-type-' + m.type}>${m.type}</span>
                <span className="lb-model-provider">${m.provider}</span>
              </div>
              <h3 className="lb-model-name">${m.name}</h3>
              <code className="lb-model-id">${m.id}</code>
              <div className="lb-model-footer">
                <span className="lb-model-cost"><${Icons.Zap} size=${12} /> ${m.credit_cost} credits</span>
                <${Link} to="/login?next=/dashboard" className="lb-model-try">Try <${Icons.ArrowRight} size=${12} /><//>
              </div>
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}

// ===================== UNIVERSAL BALANCE =====================
function Balance() {
  return html`
    <section className="lb-section">
      <div className="lb-container">
        <div className="lb-balance-grid">
          <div className="lb-balance-visual">
            <div className="lb-wallet">
              <div className="lb-wallet-head">
                <span>Universal balance</span>
                <${Icons.Wallet} size=${16} />
              </div>
              <div className="lb-wallet-amount">Rp 100.000</div>
              <div className="lb-wallet-sub">≈ 1.000 credits</div>
            </div>
            <div className="lb-wallet-flows">
              <div className="lb-flow"><${Icons.MessageSquare} size=${14} /> AI Chat</div>
              <div className="lb-flow"><${Icons.Image} size=${14} /> Image Studio</div>
              <div className="lb-flow"><${Icons.AudioLines} size=${14} /> Audio Studio</div>
              <div className="lb-flow"><${Icons.Wrench} size=${14} /> Dynamic Tools</div>
            </div>
          </div>
          <div className="lb-balance-copy">
            <div className="lb-eyebrow"><span>Balance</span></div>
            <h2 className="lb-title">One wallet. Every tool.</h2>
            <p className="lb-lead">
              Tanpa langganan per layanan. Isi saldo sekali, pakai untuk semua tool yang mendukung balance. Biaya selalu ditampilkan sebelum job berjalan.
            </p>
            <ul className="lb-balance-list">
              <li><${Icons.Check} size=${14} /> <strong>Rp 100 = 1 credit</strong> (default rate, adjustable)</li>
              <li><${Icons.Check} size=${14} /> Atomic debit — job tidak akan jalan jika kredit kurang</li>
              <li><${Icons.Check} size=${14} /> Setiap transaksi dicatat dengan alasan & referensi</li>
              <li><${Icons.Check} size=${14} /> Job gagal akan otomatis di-refund</li>
            </ul>
            <${Link} to="/login?next=/dashboard/credit" className="lb-btn lb-btn-primary">
              Top up balance <${Icons.ArrowRight} size=${14} />
            <//>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ===================== FEATURES =====================
function Features() {
  return html`
    <section id="features" className="lb-section lb-section-alt">
      <div className="lb-container">
        <div className="lb-section-head">
          <div>
            <div className="lb-eyebrow"><span>Why VYRA</span></div>
            <h2 className="lb-title">Built for the way you actually work.</h2>
          </div>
        </div>
        <div className="lb-features">
          <div className="lb-feature lb-feature-lg">
            <div className="lb-feature-icon"><${Icons.LayoutDashboard} size=${20} /></div>
            <h3>One workspace. Every modality.</h3>
            <p>Ngobrol dengan karakter AI (Elisa & Cila), buat gambar dengan fitur Face Lock, dan ubah teks jadi suara (TTS) — semua dari satu dashboard. Kredit, riwayat, dan API key ada di sini.</p>
          </div>
          <div className="lb-feature">
            <div className="lb-feature-icon"><${Icons.Code2} size=${20} /></div>
            <h3>Developer-first API</h3>
            <p>Bearer tokens, per-key revocation, per-job idempotency. Ship AI tanpa pusing mikirin infrastruktur.</p>
          </div>
          <div className="lb-feature">
            <div className="lb-feature-icon"><${Icons.Receipt} size=${20} /></div>
            <h3>Honest usage tracking</h3>
            <p>Setiap job dan perubahan kredit dicatat secara transparan — tidak ada black box.</p>
          </div>
          <div className="lb-feature lb-feature-wide">
            <div className="lb-feature-icon"><${Icons.Coins} size=${20} /></div>
            <h3>Credits that behave</h3>
            <p>Satu saldo, konversi transparan, atomic debit. Jika proses AI gagal di tengah jalan, kredit kamu tidak akan hangus begitu saja.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ===================== HOW IT WORKS =====================
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Explore', text: 'Jelajahi katalog tools — mulai dari AI Chat, Image, hingga Audio.' },
    { n: '02', title: 'Choose', text: 'Pilih model atau tool, dan lihat biaya kreditnya secara langsung.' },
    { n: '03', title: 'Create', text: 'Jalankan proses di workspace, atau panggil lewat Developer API.' },
    { n: '04', title: 'Review', text: 'Semua hasil dan riwayat kredit tersimpan rapi di dashboard.' },
  ];
  return html`
    <section className="lb-section">
      <div className="lb-container">
        <div className="lb-section-head">
          <div>
            <div className="lb-eyebrow"><span>How it works</span></div>
            <h2 className="lb-title">From idea to output in four steps.</h2>
          </div>
        </div>
        <div className="lb-steps">
          ${steps.map(s => html`
            <div className="lb-step" key=${s.n}>
              <div className="lb-step-num">${s.n}</div>
              <h3>${s.title}</h3><p>${s.text}</p>
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}

// ===================== DEVELOPER =====================
function Developer() {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const codeCurl = `curl -X POST ${baseUrl}/api/v1/jobs \\\n  -H "Authorization: Bearer zy_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"model_id":"gpt-4o","input":{"prompt":"Hello"}}'`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(codeCurl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return html`
    <section id="developers" className="lb-dev-section">
      <div className="lb-container">
        <div className="lb-dev-grid">
          <div className="lb-dev-copy">
            <div className="lb-eyebrow lb-eyebrow-light"><span>For developers</span></div>
            <h2 className="lb-title lb-title-light">Ship AI features without the plumbing.</h2>
            <p className="lb-lead lb-lead-light">Generate API key, tembak satu endpoint. Kredit terpotong otomatis, job idempotent, dan audit trail sudah include.</p>
            <ul className="lb-dev-list">
              <li><${Icons.Check} size=${14} /> Bearer token auth, scoped per key</li>
              <li><${Icons.Check} size=${14} /> Idempotent job creation</li>
              <li><${Icons.Check} size=${14} /> Real-time job status</li>
              <li><${Icons.Check} size=${14} /> Per-key rate limits</li>
            </ul>
            <div className="lb-dev-actions">
              <${Link} to="/login?next=/dashboard/keys" className="lb-btn lb-btn-primary lb-btn-lg">
                Get an API key <${Icons.ArrowRight} size=${16} />
              <//>
              <${Link} to="/login?next=/dashboard/docs" className="lb-btn lb-btn-ghost-dark lb-btn-lg">
                Read the Docs
              <//>
            </div>
          </div>
          <div className="lb-dev-code">
            <div className="lb-code-block">
              <div className="lb-code-head">
                <div className="lb-code-tabs"><span className="active">cURL</span></div>
                <button className="lb-code-copy" onClick=${copy}><${Icons.Copy} size=${12} /> ${copied ? 'Copied' : 'Copy'}</button>
              </div>
              <pre className="lb-code-body"><code>${codeCurl}</code></pre>
            </div>
            <div className="lb-code-block">
              <div className="lb-code-head"><span className="lb-code-label">Response · 202</span></div>
              <pre className="lb-code-body"><code>${'{\n  "success": true,\n  "data": {\n    "job_id": "6111ddf2-...",\n    "status": "processing",\n    "credits_remaining": 45\n  }\n}'}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ===================== COMPARISON =====================
function Comparison() {
  return html`
    <section id="compare" className="lb-section lb-section-alt">
      <div className="lb-container">
        <div className="lb-section-head lb-center">
          <div>
            <div className="lb-eyebrow"><span>How it compares</span></div>
            <h2 className="lb-title">Subscription vs. pay-as-you-go.</h2>
            <p className="lb-lead">Setiap model punya kelebihannya. Ini perbandingan jujurnya — tanpa angka palsu.</p>
          </div>
        </div>
        <div className="lb-compare">
          <div className="lb-compare-row lb-compare-head">
            <div>Aspect</div>
            <div className="lb-compare-vyra">VYRA</div>
            <div>Subscription AI (ChatGPT, Claude, Gemini)</div>
          </div>
          <div className="lb-compare-row">
            <div>Pricing model</div>
            <div className="lb-compare-vyra">Pay-as-you-go credits</div>
            <div>Fixed monthly fee</div>
          </div>
          <div className="lb-compare-row">
            <div>Commitment</div>
            <div className="lb-compare-vyra">No recurring charge</div>
            <div>Auto-renew unless cancelled</div>
          </div>
          <div className="lb-compare-row">
            <div>Cost per use</div>
            <div className="lb-compare-vyra">Charged only when you run a job</div>
            <div>Paid upfront whether you use it or not</div>
          </div>
          <div className="lb-compare-row">
            <div>Model coverage</div>
            <div className="lb-compare-vyra">Multiple providers, one wallet</div>
            <div>Locked to one provider's models</div>
          </div>
          <div className="lb-compare-row">
            <div>Best for</div>
            <div className="lb-compare-vyra">Occasional or varied use, developers, experimentation</div>
            <div>Heavy daily use of a single model</div>
          </div>
          <div className="lb-compare-note">
            <${Icons.Info} size=${13} />
            <span>Harga langganan tiap provider bisa berubah-ubah tergantung region dan plan. Cek halaman resmi mereka untuk rate terbaru.</span>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ===================== PRICING =====================
function Pricing() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/pricing/packages')
      .then(r => setPackages(r.data.packages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (pkg) => {
    setBuying(pkg.id); setMsg('');
    try {
      const me = await api('/api/user/me').catch(() => null);
      if (!me) { window.location.href = '/login?next=/dashboard/credit'; return; }

      const res = await api('/api/payment/purchase-package', {
        method: 'POST', body: { package_id: pkg.id },
      });
      setMsg(`Paket ${pkg.name} dibuat. Simulasi pembayaran...`);
      setTimeout(async () => {
        await fetch('/api/payment/webhook', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_ref: res.data.provider_ref, status: 'success' }),
        });
        setMsg(`✅ ${pkg.base_credits + pkg.bonus_credits} kredit ditambahkan.`);
        window.dispatchEvent(new Event('refresh-user'));
        setTimeout(() => { window.location.href = '/dashboard/credit'; }, 800);
      }, 1200);
    } catch (e) {
      setMsg('Gagal: ' + e.message);
    } finally { setBuying(null); }
  };

  return html`
    <section id="pricing" className="lb-section">
      <div className="lb-container">
        <div className="lb-section-head lb-center">
          <div>
            <div className="lb-eyebrow"><span>Pricing</span></div>
            <h2 className="lb-title">Buy credits. Use across the platform.</h2>
            <p className="lb-lead">Sekali beli. Tanpa auto-renew. Kredit tidak akan hangus.</p>
          </div>
        </div>

        ${msg && html`<div className="badge badge-primary" style=${{ display: 'block', padding: '12px', marginBottom: '24px', textAlign: 'center' }}>${msg}</div>`}

        ${loading && html`<div className="lb-loading">Memuat paket...</div>`}

        ${!loading && html`
          <div className="lb-pkg-grid">
            ${packages.map(p => {
              const total = p.base_credits + p.bonus_credits;
              const pricePerCredit = Math.round(p.price_idr / total);
              const isBest = p.badge === 'Best Value';
              return html`
                <div className=${'lb-pkg-card ' + (isBest ? 'lb-pkg-best' : '')} key=${p.id}>
                  ${p.badge && html`<div className="lb-pkg-badge">${p.badge}</div>`}
                  <div className="lb-pkg-name">${p.name}</div>
                  <div className="lb-pkg-price">Rp ${p.price_idr.toLocaleString('id-ID')}</div>
                  <div className="lb-pkg-credits">
                    <span className="lb-pkg-main">${p.base_credits} credits</span>
                    ${p.bonus_credits > 0 && html`<span className="lb-pkg-bonus">+${p.bonus_credits} bonus</span>`}
                  </div>
                  <div className="lb-pkg-total">${total} credits total</div>
                  <div className="lb-pkg-per">≈ Rp ${pricePerCredit.toLocaleString('id-ID')} / credit</div>
                  <button
                    className=${'lb-btn lb-btn-lg ' + (isBest ? 'lb-btn-primary' : 'lb-btn-secondary')}
                    style=${{ width: '100%', marginTop: '16px' }}
                    onClick=${() => handleBuy(p)}
                    disabled=${buying === p.id}
                  >
                    ${buying === p.id ? 'Memproses...' : 'Purchase'}
                  </button>
                </div>
              `;
            })}
          </div>
        `}

        <p className="lb-pricing-note">
          <${Icons.Info} size=${13} />
          Biaya kredit tiap model/tool ditampilkan sebelum job berjalan. Konversi saldo ke kredit menggunakan rate default platform (Rp 100 = 1 credit).
        </p>
      </div>
    </section>
  `;
}

// ===================== FAQ =====================
function FAQ() {
  const items = [
    { q: 'Apa itu VYRA?', a: 'VYRA adalah workspace digital multifungsi yang menyatukan AI Character Chat (Elisa, Cila), Image Studio (T2I/I2I), Audio Studio (Text-to-Speech), dan utilitas dinamis lainnya dalam satu akun dengan satu sistem balance universal.' },
    { q: 'Karakter AI apa saja yang tersedia?', a: 'Saat ini ada Elisa (manis dan perhatian) dan Cila (bocah petakilan). Kamu bisa mengobrol dengan mereka menggunakan teks, atau mendengarkan balasan suara (Voice Note) secara langsung.' },
    { q: 'Bagaimana cara kerja Audio Studio?', a: 'Kamu bisa mengubah teks apa pun menjadi suara realistis. Kami menggunakan model ElevenLabs terbaru (V4, V4 Turbo, dll) dengan sistem dukungan Audio Tags (seperti [excited], [laughs]). Kamu bahkan bisa memasukkan Voice ID ElevenLabs milikmu sendiri.' },
    { q: 'Apakah ada fitur Image to Image (I2I)?', a: 'Ya. Di Image Studio, kamu bisa mengunggah foto referensi. Tersedia juga fitur Face Lock (Pertahankan Wajah), Posture Lock (Postur), dan lainnya agar hasil gambar AI tetap mempertahankan identitas asli subjek.' },
    { q: 'Bagaimana sistem balance bekerja?', a: 'Kamu punya satu saldo utama yang dapat digunakan untuk semua tool berbayar. Setiap job memotong saldo sesuai tarif tool yang dipilih (misal: Chat 2 kredit, Audio 3 kredit). Setiap perubahan dicatat dengan alasan dan referensi transaksi.' },
    { q: 'Berapa harga satu kredit?', a: 'Rate default: Rp 100 = 1 kredit. Kredit dapat dibeli langsung melalui paket (dengan bonus untuk paket besar) atau dikonversi dari saldo rupiah.' },
    { q: 'Apakah ada langganan bulanan?', a: 'Tidak. Model bisnis VYRA adalah pay-as-you-go. Kamu membeli kredit sekali, dan menggunakannya sesuai kebutuhan tanpa biaya berulang.' },
    { q: 'Apakah ada Developer API?', a: 'Ya. Setelah login, kamu bisa membuat API key di dashboard. Endpoint utama: POST /api/v1/jobs dengan Bearer token. Dokumentasi lengkap tersedia setelah login.' },
    { q: 'Bagaimana cara menambah tool baru?', a: 'Katalog dirancang scalable (menggunakan Dynamic Feature Builder). Tool baru ditambahkan oleh admin melalui database, dengan kategori, status, dan tarif kredit. Fitur baru akan otomatis muncul di halaman ini.' },
    { q: 'Bagaimana kalau job gagal?', a: 'Jika job gagal setelah saldo terpotong, sistem mengembalikan kredit secara otomatis (Refund). Semua refund tercatat di riwayat kredit.' },
  ];
  const [open, setOpen] = useState(0);
  return html`
    <section id="faq" className="lb-section lb-section-alt">
      <div className="lb-container">
        <div className="lb-section-head lb-center">
          <div>
            <div className="lb-eyebrow"><span>FAQ</span></div>
            <h2 className="lb-title">Frequently asked questions.</h2>
          </div>
        </div>
        <div className="lb-faq">
          ${items.map((it, i) => html`
            <div className=${'lb-faq-item ' + (open === i ? 'open' : '')} key=${i}>
              <button className="lb-faq-q" aria-expanded=${open === i} onClick=${() => setOpen(open === i ? -1 : i)}>
                <span>${it.q}</span>
                <${Icons.Plus} size=${16} className="lb-faq-icon" />
              </button>
              ${open === i && html`<div className="lb-faq-a">${it.a}</div>`}
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}

// ===================== FINAL CTA =====================
function FinalCTA() {
  return html`
    <section className="lb-final-cta">
      <div className="lb-container">
        <div className="lb-final-inner">
          <h2 className="lb-final-title">Make room for better ideas.</h2>
          <p className="lb-final-sub">Buka workspace-mu, pilih tool, dan mulai berkarya hari ini.</p>
          <div className="lb-final-actions">
            <${Link} to="/login?next=/dashboard" className="lb-btn lb-btn-primary lb-btn-lg">
              Start Building <${Icons.ArrowRight} size=${16} />
            <//>
            <a href="#tools" className="lb-btn lb-btn-ghost-dark lb-btn-lg">Explore Tools</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ===================== FOOTER =====================
function Footer() {
  const year = new Date().getFullYear();
  return html`
    <footer className="lb-footer">
      <div className="lb-container">
        <div className="lb-footer-grid">
          <div className="lb-footer-brand">
            <div className="lb-logo">
              <img src="/image/logo.png" alt="VYRA" onError=${(e) => { e.target.style.display = 'none'; }} />
              <span>VYRA<span className="lb-logo-dot">.AI</span></span>
            </div>
            <p>One workspace for AI and digital tools — with a universal balance and a developer API that behave.</p>
          </div>
          <div className="lb-footer-col">
            <h4>Product</h4>
            <a href="#tools">Tools</a><a href="#models">Models</a>
            <a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          </div>
          <div className="lb-footer-col">
            <h4>Developers</h4>
            <${Link} to="/login?next=/dashboard/keys">API Keys<//>
            <${Link} to="/login?next=/dashboard/docs">Documentation<//>
            <a href="#developers">API Overview</a>
          </div>
          <div className="lb-footer-col">
            <h4>Account</h4>
            <${Link} to="/login">Login<//>
            <${Link} to="/login?next=/dashboard">Get Started<//>
          </div>
        </div>
        <div className="lb-footer-bottom">
          <span>© ${year} VYRA</span>
          <span className="lb-footer-status"><span className="lb-status-dot"></span>All systems operational</span>
        </div>
      </div>
    </footer>
  `;
}

// ===================== MAIN =====================
export default function Landing() {
  return html`
    <div className="lb-root">
      <${Banner} /><${Header} />
      <main>
        <${Hero} /><${Trust} /><${Tools} /><${Models} />
        <${Balance} /><${Features} /><${HowItWorks} />
        <${Developer} /><${Comparison} /><${Pricing} />
        <${FAQ} /><${FinalCTA} />
      </main>
      <${Footer} />
    </div>
  `;
}
