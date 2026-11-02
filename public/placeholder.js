import { Link } from 'https://esm.sh/react-router-dom@6.27.0?deps=react@18.3.1';
import { html, Icons, Card, PageHeader, EmptyState } from './ui.js';

const META = {
  audio: { icon: Icons.AudioLines, title: 'Audio Studio', desc: 'Tools audio akan tersedia saat provider audio aktif.' },
  code: { icon: Icons.Code2, title: 'Code Workspace', desc: 'Workspace khusus untuk coding akan hadir di rilis berikutnya.' },
  favorites: { icon: Icons.Star, title: 'Favorites', desc: 'Simpan tools favorit Anda untuk akses cepat. Fitur bookmark akan tersedia segera.' },
  help: { icon: Icons.HelpCircle, title: 'Help Center', desc: 'Panduan lengkap dan FAQ akan tersedia di sini.' },
  pricing: { icon: Icons.CreditCard, title: 'Plans & Pricing', desc: 'Paket kredit dan harga lengkap ada di landing page.' },
};

export default function Placeholder({ page, titleOverride, descOverride }) {
  const m = META[page] || { icon: Icons.Box, title: 'Segera Hadir', desc: 'Halaman ini sedang dalam pengembangan.' };
  const Icon = m.icon;
  return html`
    <div>
      <${PageHeader} title=${titleOverride || m.title} />
      <${Card}>
        <${EmptyState}
          icon=${Icon}
          title=${titleOverride || m.title}
          description=${descOverride || m.desc}
          action=${page === 'pricing'
            ? html`<a href="/#pricing" className="btn btn-primary">Lihat Paket</a>`
            : html`<${Link} to="/dashboard" className="btn btn-secondary">Kembali ke Overview<//>`}
        />
      <//>
    </div>
  `;
}