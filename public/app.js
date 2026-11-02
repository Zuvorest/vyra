import { createElement, useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { api } from './api.js';
import { html, Icons, Button, Input, fmtNum, fmtIDR } from './ui.js';

// ============ PAGE IMPORTS ============
import Landing from './landing.js';
import Dashboard from './dashboard.js';
import ChatElisa from './chat.js';
import ImageStudio from './image.js';
import VideoStudio from './video.js';
import ExploreModels from './models.js';
import Credit from './credit.js';
import Usage from './usage.js';
import ApiKeys from './keys.js';
import Docs from './docs.js';
import Profile from './profile.js';
import Settings from './settings.js';
import NotificationsPage from './notifications.js';
import AdminHome from './admin.js';
import AdminUsers from './admin_user.js';
import AdminModels from './admin_model.js';
import AdminLogs from './admin_log.js';
import AdminSettings from './admin_set.js';
import Tools from './tools.js';
import Trans from './trans.js';
import Creations from './creations.js';
import PricingPage from './pricing.js';
import FavoritesPage from './favorites.js';
import AuthCallback from './auth_cb.js';
import Placeholder from './placeholder.js';
import AdminFeatures from './admin_feat.js';
import ToolDetail from './tool_detail.js';
import AudioStudio from './audio.js';

// Contoh menambahkan di routes:


// Jangan lupa import di bagian paling atas:


// ==================== LOGIN ====================
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      window.location.href = safe;
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const googleLogin = async () => {
    setError(''); setGoogleLoading(true);
    try {
      const res = await api('/api/auth/google-url');
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next) sessionStorage.setItem('oauth_next', next);
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  return html`
    <div className="flex items-center justify-center" style=${{ minHeight: '100vh', padding: '16px' }}>
      <div className="card" style=${{ width: '100%', maxWidth: '400px' }}>
        <img src="/image/logo.png" alt="VYRA" style=${{ height: '40px', marginBottom: '24px' }}
          onError=${e => e.target.style.display='none'} />
        <h2 style=${{ marginBottom: '8px' }}>Masuk ke VYRA</h2>
        <p className="text-sm text-muted" style=${{ marginBottom: '24px' }}>Pilih cara masuk Anda.</p>

        ${error && html`<div className="badge badge-error" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${error}</div>`}

        <button
          type="button"
          className="btn btn-secondary"
          style=${{ width: '100%', marginBottom: '16px', height: '42px' }}
          onClick=${googleLogin}
          disabled=${googleLoading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style=${{ marginRight: '8px' }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          ${googleLoading ? 'Mengalihkan...' : 'Lanjutkan dengan Google'}
        </button>

        <div style=${{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style=${{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span className="text-xs text-muted">atau via email</span>
          <div style=${{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>

        <form onSubmit=${submit}>
          <${Input} label="Email" type="email" value=${email} onInput=${e => setEmail(e.target.value)} required />
          <${Input} label="Password" type="password" value=${password} onInput=${e => setPassword(e.target.value)} required />
          <${Button} type="submit" variant="primary" disabled=${loading} style=${{ width: '100%', marginTop: '8px' }}>
            ${loading ? 'Memproses...' : 'Masuk dengan Email'}
          <//>
        </form>

        <p className="text-xs text-muted" style=${{ marginTop: '16px', textAlign: 'center' }}>
          Belum punya akun? Daftar dulu atau hubungi admin.
        </p>
      </div>
    </div>
  `;
}

// ==================== APP SHELL ====================
function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchUser = () => {
      api('/api/user/me')
        .then(res => setUser(res.data))
        .catch((err) => {
          if (/login|unauthor/i.test(err.message)) {
            const next = window.location.pathname + window.location.search;
            window.location.replace('/login?next=' + encodeURIComponent(next));
          }
        });
    };
    fetchUser();
    window.addEventListener('refresh-user', fetchUser);
    return () => window.removeEventListener('refresh-user', fetchUser);
  }, []);

  useEffect(() => {
    const fetchCount = () => {
      api('/api/notifications/unread-count')
        .then(r => setNotifCount(r.data.count || 0))
        .catch(() => {});
    };
    fetchCount();
    const iv = setInterval(fetchCount, 60000);
    window.addEventListener('refresh-notif', fetchCount);
    return () => {
      clearInterval(iv);
      window.removeEventListener('refresh-notif', fetchCount);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isAdmin = user?.auth?.role === 'admin';

  const navGroups = [
    {
      label: 'Workspace',
      links: [
        { to: '/dashboard', label: 'Overview', icon: Icons.LayoutDashboard, exact: true },
        { to: '/dashboard/tools', label: 'Explore Tools', icon: Icons.Boxes },
        { to: '/dashboard/chat', label: 'AI Chat', icon: Icons.MessageSquare },
        { to: '/dashboard/image', label: 'Image Studio', icon: Icons.Image },
        { to: '/dashboard/video', label: 'Video Studio', icon: Icons.Video },
        { to: '/dashboard/audio', label: 'Audio Studio', icon: Icons.AudioLines },
        { to: '/dashboard/code', label: 'Code Workspace', icon: Icons.Code2 },
        { to: '/dashboard/creations', label: 'My Creations', icon: Icons.Sparkles },
        { to: '/dashboard/favorites', label: 'Favorites', icon: Icons.Star },
        { to: '/dashboard/usage', label: 'Recent Activity', icon: Icons.Activity },
      ],
    },
    {
      label: 'Resources',
      links: [
        { to: '/dashboard/models', label: 'Models', icon: Icons.Cpu },
        { to: '/dashboard/keys', label: 'API & Developers', icon: Icons.Key },
        { to: '/dashboard/docs', label: 'Documentation', icon: Icons.BookOpen },
      ],
    },
    {
      label: 'Account',
      links: [
        { to: '/dashboard/credit', label: 'Balance & Usage', icon: Icons.Wallet },
        { to: '/dashboard/transactions', label: 'Transactions', icon: Icons.Receipt },
        { to: '/dashboard/pricing', label: 'Plans & Pricing', icon: Icons.CreditCard },
        { to: '/dashboard/notifications', label: 'Notifications', icon: Icons.Bell },
        { to: '/dashboard/settings', label: 'Settings', icon: Icons.Settings },
        { to: '/dashboard/help', label: 'Help Center', icon: Icons.HelpCircle },
      ],
    },
  ];

  if (isAdmin) {
    navGroups.unshift({
      label: 'Admin',
      links: [
        { to: '/dashboard/admin', label: 'Admin Overview', icon: Icons.Shield, exact: true },
        { to: '/dashboard/admin/users', label: 'Kelola Users', icon: Icons.Users },
        { to: '/dashboard/admin/models', label: 'Kelola Models', icon: Icons.Box },
        { to: '/dashboard/admin/logs', label: 'Audit Log', icon: Icons.FileText },
        { to: '/dashboard/admin/settings', label: 'Admin Settings', icon: Icons.SlidersHorizontal },
        { to: '/dashboard/admin/features', label: 'Feature Builder', icon: Icons.Wrench },
      ],
    });
  }

  const isActive = (link) => {
    if (link.exact) return location.pathname === link.to;
    return location.pathname === link.to || location.pathname.startsWith(link.to + '/');
  };

  const pageTitle = (() => {
    const allLinks = navGroups.flatMap(g => g.links);
    const match = allLinks.find(l => isActive(l));
    return match ? match.label : 'Dashboard';
  })();

  const userInitial = user
    ? ((user.profile?.display_name || user.auth?.email || '?')[0] || '?').toUpperCase()
    : '?';

  return html`
    <div className="app-shell">
      ${sidebarOpen && html`<div className="sidebar-overlay" onClick=${() => setSidebarOpen(false)}></div>`}

      <aside className=${'sidebar ' + (sidebarOpen ? 'open' : '')}>
        <${Link} to="/dashboard" className="sidebar-brand">
          <img src="/image/logo.png" alt="Z" onError=${e => e.target.style.display='none'} />
          <span>VYRA<span style=${{ color: 'var(--primary)' }}>.AI</span></span>
        <//>

        <div className="sidebar-nav">
          ${navGroups.map(group => html`
            <div className="sidebar-section" key=${group.label}>
              <div className="sidebar-label">${group.label}</div>
              ${group.links.map(link => {
                const Icon = link.icon;
                const active = isActive(link);
                return html`
                  <${Link} to=${link.to} className=${'nav-link ' + (active ? 'active' : '')}>
                    <${Icon} size=${16} />
                    <span>${link.label}</span>
                  <//>
                `;
              })}
            </div>
          `)}
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <div className="header-left">
            <button className="icon-btn mobile-toggle" onClick=${() => setSidebarOpen(true)} aria-label="Menu">
              <${Icons.Menu} size=${20} />
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-root">Dashboard</span>
              ${location.pathname !== '/dashboard' && html`
                <${Icons.ChevronRight} size=${14} className="breadcrumb-sep" />
                <span className="breadcrumb-current">${pageTitle}</span>
              `}
            </div>
          </div>

          <div className="header-center">
            <button className="search-trigger" disabled title="Segera hadir">
              <${Icons.Search} size=${15} />
              <span>Cari tools, model, halaman...</span>
              <kbd>⌘K</kbd>
            </button>
          </div>

          <div className="header-right">
            <div className="header-balance" title="Credit balance">
              <${Icons.Zap} size=${14} />
              <span>${user ? fmtNum(user.credits) : '...'}</span>
            </div>

            <button
              className="icon-btn"
              onClick=${() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              ${theme === 'dark' ? html`<${Icons.Sun} size=${18} />` : html`<${Icons.Moon} size=${18} />`}
            </button>

            <${Link} to="/dashboard/notifications" className="icon-btn" aria-label="Notifications" style=${{ position: 'relative' }}>
              <${Icons.Bell} size=${18} />
              ${notifCount > 0 && html`<span className="notif-dot">${notifCount > 9 ? '9+' : notifCount}</span>`}
            <//>

            <div className="user-menu-wrap">
              <button className="user-btn" onClick=${() => setUserMenuOpen(!userMenuOpen)}>
                <div className="avatar">${userInitial}</div>
              </button>
              ${userMenuOpen && html`
                <div className="user-menu">
                  <div className="user-menu-head">
                    <div className="user-menu-name">${user?.profile?.display_name || 'User'}</div>
                    <div className="user-menu-email">${user?.auth?.email || '-'}</div>
                  </div>
                  <${Link} to="/dashboard/profile" className="user-menu-item">
                    <${Icons.User} size=${14} /> Profil
                  <//>
                  <${Link} to="/dashboard/settings" className="user-menu-item">
                    <${Icons.Settings} size=${14} /> Pengaturan
                  <//>
                  <${Link} to="/dashboard/credit" className="user-menu-item">
                    <${Icons.Wallet} size=${14} /> ${user ? fmtIDR(user.balance?.amount || 0) : '...'}
                  <//>
                  <div className="user-menu-divider"></div>
                  <button
                    className="user-menu-item"
                    onClick=${async () => {
                      try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
                      window.location.href = '/';
                    }}
                  >
                    <${Icons.LogOut} size=${14} /> Keluar
                  </button>
                </div>
              `}
            </div>
          </div>
        </header>

        <main className="content fade-in">
          ${children}
        </main>
      </div>
    </div>
  `;
}

// ==================== ROUTER ====================
function App() {
  return html`
    <${BrowserRouter}>
      <${Routes}>
        <${Route} path="/" element=${html`<${Landing} />`} />
        <${Route} path="/login" element=${html`<${Login} />`} />
        <${Route} path="/auth/callback" element=${html`<${AuthCallback} />`} />

        <${Route} path="/dashboard/*" element=${html`
          <${AppShell}>
            <${Routes}>
              <${Route} index element=${html`<${Dashboard} />`} />
              <${Route} path="tools" element=${html`<${Tools} />`} />
              <${Route} path="tools/:category/:slug" element=${html`<${ToolDetail} />`} />
<${Route} path="chat" element=${html`<${ChatElisa} />`} />
              <${Route} path="image" element=${html`<${ImageStudio} />`} />
              <${Route} path="video" element=${html`<${VideoStudio} />`} />
<${Route} path="audio" element=${html`<${AudioStudio} />`} />
              <${Route} path="code" element=${html`<${Placeholder} page="code" />`} />
              <${Route} path="creations" element=${html`<${Creations} />`} />
              <${Route} path="favorites" element=${html`<${FavoritesPage} />`} />
              <${Route} path="usage" element=${html`<${Usage} />`} />
              <${Route} path="models" element=${html`<${ExploreModels} />`} />
              <${Route} path="credit" element=${html`<${Credit} />`} />
              <${Route} path="transactions" element=${html`<${Trans} />`} />
              <${Route} path="pricing" element=${html`<${PricingPage} />`} />
              <${Route} path="keys" element=${html`<${ApiKeys} />`} />
              <${Route} path="docs" element=${html`<${Docs} />`} />
              <${Route} path="profile" element=${html`<${Profile} />`} />
              <${Route} path="settings" element=${html`<${Settings} />`} />
              <${Route} path="notifications" element=${html`<${NotificationsPage} />`} />
              <${Route} path="help" element=${html`<${Placeholder} page="help" />`} />
              <${Route} path="admin" element=${html`<${AdminHome} />`} />
              <${Route} path="admin/users" element=${html`<${AdminUsers} />`} />
              <${Route} path="admin/models" element=${html`<${AdminModels} />`} />
              <${Route} path="admin/logs" element=${html`<${AdminLogs} />`} />
              <${Route} path="admin/settings" element=${html`<${AdminSettings} />`} />
              <${Route} path="*" element=${html`<${Placeholder} titleOverride="Halaman tidak ditemukan" descOverride="Route ini belum tersedia." />`} />
              <${Route} path="admin/features" element=${html`<${AdminFeatures} />`} />
            <//>
          <//>
        `} />

        <${Route} path="*" element=${html`<${Navigate} to="/" replace />`} />
      <//>
    <//>
  `;
}

createRoot(document.getElementById('root')).render(html`<${App} />`);