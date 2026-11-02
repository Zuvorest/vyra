
import { useState, useEffect } from 'https://esm.sh/react@18.3.1';
import { api } from './api.js';
import { html, Icons, Card, PageHeader, Button, EmptyState } from './ui.js';

const VAL_LABELS = { draft: 'Draft', pending: 'Pending', ready: 'Ready', published: 'Published', error: 'Error' };
const VAL_BADGE = { draft: 'primary', pending: 'warning', ready: 'success', published: 'success', error: 'error' };

const slugify = (s) => String(s || '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminFeatures() {
  const [tab, setTab] = useState('features');
  const [stats, setStats] = useState(null);
  const [tools, setTools] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [editing, setEditing] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [editingSub, setEditingSub] = useState(null); // { categoryId, sub? }
  const [expandedCat, setExpandedCat] = useState(null);
  const [rescanning, setRescanning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, c, sc] = await Promise.all([
        api('/api/feature/stats'),
        api('/api/feature/tools?limit=300' + (filter.category ? '&category=' + filter.category : '') + (filter.status ? '&status=' + filter.status : '')),
        api('/api/feature/categories'),
        api('/api/feature/subcategories'),
      ]);
      setStats(s.data);
      setTools(t.data.tools || []);
      setCategories(c.data.categories || []);
      setSubcategories(sc.data.subcategories || []);
    } catch (e) { setMsg('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter.category, filter.status]);

  const rescan = async () => {
    setRescanning(true); setMsg('');
    try {
      const r = await api('/api/feature/rescan', { method: 'POST' });
      setMsg('✓ ' + r.message);
      load();
    } catch (e) { setMsg('✗ ' + e.message); }
    finally { setRescanning(false); }
  };

  const publish = async (id) => {
    try { await api('/api/feature/tools/' + id + '/publish', { method: 'POST' }); load(); }
    catch (e) { alert(e.message); }
  };
  const unpublish = async (id) => {
    if (!confirm('Unpublish fitur ini?')) return;
    try { await api('/api/feature/tools/' + id + '/unpublish', { method: 'POST' }); load(); }
    catch (e) { alert(e.message); }
  };
  const duplicate = async (id) => {
    try { await api('/api/feature/tools/' + id + '/duplicate', { method: 'POST' }); load(); }
    catch (e) { alert(e.message); }
  };
  const removeTool = async (id, name) => {
  const choice = prompt(
    `Hapus "${name}"?\n\nKetik:\n  1 = Sembunyikan (soft delete, bisa di-restore)\n  2 = Hapus permanen dari DB (tidak bisa dibalikkan)\n\nKosongkan untuk batal.`,
    '1'
  );
  if (choice === '1') {
    try { await api('/api/feature/tools/' + id, { method: 'DELETE' }); load(); }
    catch (e) { alert(e.message); }
  } else if (choice === '2') {
    if (!confirm('Yakin hapus PERMANEN? Aksi tidak bisa dibatalkan.')) return;
    try {
      await api('/api/feature/tools/' + id + '/hard', { method: 'DELETE' });
      load();
    } catch (e) {
      if (/job memakai/i.test(e.message)) {
        if (confirm(e.message + '\n\nHapus paksa?')) {
          await api('/api/feature/tools/' + id + '/hard?force=true', { method: 'DELETE' });
          load();
        }
      } else {
        alert(e.message);
      }
    }
  }
};
  const validate = async (id) => {
    try { const r = await api('/api/feature/tools/' + id + '/validate', { method: 'POST' });
      alert(r.data.errors.length ? 'Error:\n' + r.data.errors.join('\n') : 'Konfigurasi valid ✓');
      load();
    } catch (e) { alert(e.message); }
  };
  const removeCategory = async (id) => {
    if (!confirm('Hapus kategori ini? Sub-kategori di dalamnya ikut terhapus.')) return;
    try { await api('/api/feature/categories/' + id, { method: 'DELETE' }); load(); }
    catch (e) { alert(e.message); }
  };
  const removeSub = async (id) => {
    if (!confirm('Hapus sub-kategori ini? Fitur yang memakainya akan pindah ke "Lainnya".')) return;
    try { await api('/api/feature/subcategories/' + id, { method: 'DELETE' }); load(); }
    catch (e) { alert(e.message); }
  };

  return html`
    <div>
      <${PageHeader}
        title="Feature Builder"
        subtitle="Kelola laci, sub-laci, dan fitur"
        actions=${html`
          <${Button} variant="secondary" onClick=${rescan} disabled=${rescanning}>
            <${Icons.RefreshCw} size=${14} /> ${rescanning ? 'Scanning...' : 'Re-scan ai/'}
          <//>
        `}
      />

      ${msg && html`<div className="badge badge-primary" style=${{ display: 'block', marginBottom: '16px', padding: '12px' }}>${msg}</div>`}

      ${stats && html`
        <div className="feat-stats">
          <div className="feat-stat"><span>Kategori</span><strong>${stats.categories}</strong></div>
          <div className="feat-stat"><span>Sub-kategori</span><strong>${stats.subcategories}</strong></div>
          <div className="feat-stat"><span>Total fitur</span><strong>${stats.features}</strong></div>
          <div className="feat-stat"><span>Aktif</span><strong className="text-success">${stats.active}</strong></div>
          <div className="feat-stat"><span>Draft</span><strong className="text-warning">${stats.drafts}</strong></div>
          <div className="feat-stat"><span>Butuh perhatian</span><strong className="text-error">${stats.pending_api}</strong></div>
        </div>
      `}

      <div className="feat-tab-bar">
        <button className=${'feat-tab ' + (tab === 'features' ? 'active' : '')} onClick=${() => setTab('features')}>
          <${Icons.Wrench} size=${14} /> Fitur (${tools.length})
        </button>
        <button className=${'feat-tab ' + (tab === 'categories' ? 'active' : '')} onClick=${() => setTab('categories')}>
          <${Icons.Layers} size=${14} /> Laci / Kategori (${categories.length})
        </button>
      </div>

      ${tab === 'features' && html`
        <${Card} style=${{ marginBottom: '16px' }}>
          <div className="filter-row">
            <select className="input" style=${{ maxWidth: '200px' }}
              value=${filter.category} onChange=${e => setFilter(f => ({ ...f, category: e.target.value }))}>
              <option value="">Semua kategori</option>
              ${categories.map(c => html`<option key=${c.id} value=${c.id}>${c.name}</option>`)}
            </select>
            <select className="input" style=${{ maxWidth: '180px' }}
              value=${filter.status} onChange=${e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">Semua status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="ready">Ready</option>
              <option value="published">Published</option>
              <option value="error">Error</option>
            </select>
          </div>
        <//>

        ${loading && html`<div className="loading">Memuat...</div>`}

        ${!loading && tools.length === 0 && html`
          <${Card}>
            <${EmptyState} icon=${Icons.Boxes} title="Belum ada fitur"
              description="Tambahkan file .js ke folder /sdcard/vyra/ai/ lalu klik Re-scan."
              action=${html`<${Button} onClick=${rescan}>Re-scan ai/<//>`} />
          <//>
        `}

        ${!loading && tools.length > 0 && html`
          <${Card} padded=${false}>
            <div className="feat-table">
              <div className="feat-row feat-head">
                <div>Nama</div><div>Kategori</div><div>Sub</div><div>Harga</div><div>Status</div><div>Aksi</div>
              </div>
              ${tools.map(t => {
                const sub = subcategories.find(s => s.id === t.subcategory_id);
                return html`
                  <div className="feat-row" key=${t.id}>
                    <div>
                      <div className="feat-name">${t.name}</div>
                      <div className="feat-id mono">${t.slug || '(no slug)'}</div>
                    </div>
                    <div className="text-xs">${t.category_id}</div>
                    <div className="text-xs">${sub ? sub.name : '—'}</div>
                    <div className="text-xs">${t.credit_cost != null ? t.credit_cost + ' cr' : '—'}</div>
                    <div>
                      <span className=${'badge badge-' + (VAL_BADGE[t.validation_status] || 'default')}>
                        ${VAL_LABELS[t.validation_status] || t.validation_status}
                      </span>
                    </div>
                    <div className="feat-actions">
                      <button className="icon-btn" title="Edit" onClick=${() => setEditing(t.id)}><${Icons.Edit2} size=${14} /></button>
                      <button className="icon-btn" title="Validate" onClick=${() => validate(t.id)}><${Icons.CheckCircle} size=${14} /></button>
                      ${t.validation_status === 'published'
                        ? html`<button className="icon-btn" title="Unpublish" onClick=${() => unpublish(t.id)}><${Icons.EyeOff} size=${14} /></button>`
                        : html`<button className="icon-btn" title="Publish" onClick=${() => publish(t.id)}><${Icons.Eye} size=${14} /></button>`}
                      <button className="icon-btn" title="Duplicate" onClick=${() => duplicate(t.id)}><${Icons.Copy} size=${14} /></button>
                      <button className="icon-btn" title="Hapus" onClick=${() => removeTool(t.id, t.name)}><${Icons.Trash2} size=${14} /></button>
                    </div>
                  </div>
                `;
              })}
            </div>
          <//>
        `}
      `}

      ${tab === 'categories' && html`
        <div className="flex justify-between items-center" style=${{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style=${{ marginBottom: '4px' }}>Laci / Kategori</h3>
            <p className="text-xs text-muted">Klik laci untuk lihat dan kelola sub-kategori</p>
          </div>
          <${Button} onClick=${() => setEditingCat({})}>
            <${Icons.Plus} size=${14} /> Tambah Laci
          <//>
        </div>

        <div className="cat-tree">
          ${categories.map(c => {
            const catTools = tools.filter(t => t.category_id === c.id);
            const catSubs = subcategories.filter(s => s.category_id === c.id);
            const isExpanded = expandedCat === c.id;
            return html`
              <div className=${'cat-tree-item ' + (isExpanded ? 'expanded' : '')} key=${c.id}>
                <button className="cat-tree-head" onClick=${() => setExpandedCat(isExpanded ? null : c.id)}>
                  <${Icons.ChevronRight} size=${14} className="cat-chevron" />
                  <div className="cat-tree-title-wrap">
                    <span className="cat-tree-title">${c.name}</span>
                    <span className="cat-tree-id mono">${c.id}</span>
                  </div>
                  <div className="cat-tree-badges">
                    <span className=${'badge badge-' + (c.is_active ? 'success' : 'error')}>
                      ${c.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className="cat-tree-count">${catTools.length} fitur · ${catSubs.length} sub</span>
                  </div>
                </button>

                ${isExpanded && html`
                  <div className="cat-tree-body">
                    ${c.description && html`<p className="text-xs text-muted" style=${{ marginBottom: '12px' }}>${c.description}</p>`}

                    <div className="cat-tree-section-label">
                      <${Icons.FolderOpen} size=${12} /> Sub-kategori (${catSubs.length})
                    </div>

                    ${catSubs.length === 0 && html`
                      <div className="cat-tree-empty">Belum ada sub-kategori. Fitur akan dikelompokkan ke "Lainnya".</div>
                    `}

                    ${catSubs.length > 0 && html`
                      <div className="cat-sub-list">
                        ${catSubs.map(s => {
                          const count = catTools.filter(t => t.subcategory_id === s.id).length;
                          return html`
                            <div className="cat-sub-row" key=${s.id}>
                              <${Icons.Folder} size=${13} />
                              <span className="cat-sub-name">${s.name}</span>
                              <span className="cat-sub-count">${count} fitur</span>
                              <div className="cat-sub-actions">
                                <button className="icon-btn" title="Edit"
                                  onClick=${() => setEditingSub({ categoryId: c.id, sub: s })}>
                                  <${Icons.Edit2} size=${12} />
                                </button>
                                <button className="icon-btn" title="Hapus"
                                  onClick=${() => removeSub(s.id)}>
                                  <${Icons.Trash2} size=${12} />
                                </button>
                              </div>
                            </div>
                          `;
                        })}
                      </div>
                    `}

                    <button className="cat-add-sub"
                      onClick=${() => setEditingSub({ categoryId: c.id, sub: null })}>
                      <${Icons.Plus} size=${12} /> Tambah Sub-kategori
                    </button>

                    <div className="cat-tree-footer">
                      <${Button} variant="secondary" size="sm" onClick=${() => setEditingCat(c)}>
                        <${Icons.Edit2} size=${12} /> Edit Laci
                      <//>
                      <${Button} variant="secondary" size="sm" onClick=${() => removeCategory(c.id)}>
                        <${Icons.Trash2} size=${12} /> Hapus Laci
                      <//>
                    </div>
                  </div>
                `}
              </div>
            `;
          })}
        </div>
      `}

      ${editing && html`<${EditModal} id=${editing} categories=${categories} subcategories=${subcategories} onClose=${() => { setEditing(null); load(); }} />`}
      ${editingCat && html`<${CategoryModal} data=${editingCat} onClose=${() => { setEditingCat(null); load(); }} />`}
      ${editingSub && html`<${SubcategoryModal} categoryId=${editingSub.categoryId} sub=${editingSub.sub} onClose=${() => { setEditingSub(null); load(); }} />`}
    </div>
  `;
}

// ================= CATEGORY MODAL =================
function CategoryModal({ data, onClose }) {
  const isNew = !data.id;
  const [form, setForm] = useState({
    id: data.id || '',
    name: data.name || '',
    description: data.description || '',
    icon: data.icon || '',
    thumbnail: data.thumbnail || '',
    sort_order: data.sort_order ?? 99,
    is_active: data.is_active !== false,
    show_on_home: data.show_on_home !== false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isNew && form.name && !form.id) {
      setForm(f => ({ ...f, id: slugify(form.name) }));
    }
  }, [form.name]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api('/api/feature/categories', { method: 'POST', body: form });
      setMsg('✓ Tersimpan');
      setTimeout(() => onClose(), 600);
    } catch (e) { setMsg('✗ ' + e.message); }
    finally { setSaving(false); }
  };

  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <div className="modal" onClick=${e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>${isNew ? 'Tambah Laci' : 'Edit Laci: ' + data.name}</h3>
          <button className="icon-btn" onClick=${onClose}><${Icons.X} size=${18} /></button>
        </div>
        <div className="modal-body">
          ${msg && html`<div className=${'badge ' + (msg.startsWith('✓') ? 'badge-success' : 'badge-error')} style=${{ display: 'block', marginBottom: '12px', padding: '10px' }}>${msg}</div>`}

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">Nama Laci</label>
            <input className="input" value=${form.name} onInput=${e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Contoh: Edited Image" />
          </div>

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">ID (slug unik)</label>
            <input className="input mono" value=${form.id}
              onInput=${e => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
              placeholder="edited-image" disabled=${!isNew} />
            <p className="text-xs text-muted" style=${{ marginTop: '4px' }}>Otomatis dari nama. Tidak bisa diubah setelah dibuat.</p>
          </div>

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows="2" value=${form.description}
              onInput=${e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="form-grid">
            <div><label className="label">Icon (Lucide)</label>
              <input className="input mono" value=${form.icon} onInput=${e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="Image" /></div>
            <div><label className="label">Urutan</label>
              <input className="input" type="number" value=${form.sort_order}
                onInput=${e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
          </div>

          <div className="flex gap-4" style=${{ marginBottom: '12px' }}>
            <label className="flex items-center gap-2 text-sm" style=${{ cursor: 'pointer' }}>
              <input type="checkbox" checked=${form.is_active}
                onChange=${e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Aktif
            </label>
            <label className="flex items-center gap-2 text-sm" style=${{ cursor: 'pointer' }}>
              <input type="checkbox" checked=${form.show_on_home}
                onChange=${e => setForm(f => ({ ...f, show_on_home: e.target.checked }))} /> Tampil di home
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <${Button} variant="secondary" onClick=${onClose}>Tutup<//>
          <${Button} onClick=${save} disabled=${saving}>${saving ? 'Menyimpan...' : 'Simpan'}<//>
        </div>
      </div>
    </div>
  `;
}

// ================= SUBCATEGORY MODAL =================
function SubcategoryModal({ categoryId, sub, onClose }) {
  const isNew = !sub;
  const [form, setForm] = useState({
    category_id: categoryId,
    name: sub?.name || '',
    slug: sub?.slug || '',
    description: sub?.description || '',
    sort_order: sub?.sort_order ?? 99,
    is_active: sub?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isNew && form.name && !form.slug) {
      setForm(f => ({ ...f, slug: slugify(form.name) }));
    }
  }, [form.name]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api('/api/feature/subcategories', { method: 'POST', body: form });
      setMsg('✓ Tersimpan');
      setTimeout(() => onClose(), 600);
    } catch (e) { setMsg('✗ ' + e.message); }
    finally { setSaving(false); }
  };

  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <div className="modal" onClick=${e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>${isNew ? 'Tambah Sub-kategori' : 'Edit: ' + sub.name}</h3>
          <button className="icon-btn" onClick=${onClose}><${Icons.X} size=${18} /></button>
        </div>
        <div className="modal-body">
          ${msg && html`<div className=${'badge ' + (msg.startsWith('✓') ? 'badge-success' : 'badge-error')} style=${{ display: 'block', marginBottom: '12px', padding: '10px' }}>${msg}</div>`}

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">Kategori Induk</label>
            <input className="input mono" value=${categoryId} disabled />
          </div>

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">Nama Sub-kategori</label>
            <input className="input" value=${form.name}
              onInput=${e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Contoh: Photo Style" />
          </div>

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">Slug</label>
            <input className="input mono" value=${form.slug}
              onInput=${e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder="photo-style" />
          </div>

          <div style=${{ marginBottom: '12px' }}>
            <label className="label">Deskripsi (opsional)</label>
            <textarea className="input" rows="2" value=${form.description}
              onInput=${e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="form-grid">
            <div><label className="label">Urutan</label>
              <input className="input" type="number" value=${form.sort_order}
                onInput=${e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
            <div style=${{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
              <label className="flex items-center gap-2 text-sm" style=${{ cursor: 'pointer' }}>
                <input type="checkbox" checked=${form.is_active}
                  onChange=${e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Aktif
              </label>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <${Button} variant="secondary" onClick=${onClose}>Tutup<//>
          <${Button} onClick=${save} disabled=${saving}>${saving ? 'Menyimpan...' : 'Simpan'}<//>
        </div>
      </div>
    </div>
  `;
}

// ================= EDIT TOOL MODAL =================
function EditModal({ id, categories, subcategories, onClose }) {
  const [tool, setTool] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [section, setSection] = useState('basic');

  useEffect(() => {
    api('/api/feature/tools/' + id).then(r => setTool(r.data.tool)).catch(() => {});
  }, [id]);

  if (!tool) return html`<div className="modal-overlay"><div className="modal"><div className="loading">Memuat...</div></div></div>`;

  const update = (k, v) => setTool(t => ({ ...t, [k]: v }));
  const relevantSubs = (subcategories || []).filter(s => s.category_id === tool.category_id);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const body = {
        name: tool.name, slug: tool.slug, category_id: tool.category_id,
        subcategory_id: tool.subcategory_id || null,
        description: tool.description, long_description: tool.long_description,
        cover_image: tool.cover_image, icon: tool.icon, label: tool.label,
        instructions: tool.instructions, input_schema: tool.input_schema,
        output_schema: tool.output_schema, pricing: tool.pricing,
        examples: tool.examples, error_messages: tool.error_messages,
        requires_login: tool.requires_login, show_in_dashboard: tool.show_in_dashboard,
        credit_cost: tool.pricing?.credits ?? tool.credit_cost,
      };
      await api('/api/feature/tools/' + tool.id, { method: 'POST', body });
      setMsg('✓ Tersimpan');
    } catch (e) { setMsg('✗ ' + e.message); }
    finally { setSaving(false); }
  };

  const sections = [
    { key: 'basic', label: 'Info Dasar' },
    { key: 'visual', label: 'Visual & Contoh' },
    { key: 'input', label: 'Input Form' },
    { key: 'pricing', label: 'Harga' },
    { key: 'publish', label: 'Publish' },
  ];

  return html`
    <div className="modal-overlay" onClick=${onClose}>
      <div className="modal modal-lg" onClick=${e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Edit: ${tool.name}</h3>
          <button className="icon-btn" onClick=${onClose}><${Icons.X} size=${18} /></button>
        </div>
        <div className="modal-tabs">
          ${sections.map(s => html`
            <button key=${s.key} className=${'modal-tab ' + (section === s.key ? 'active' : '')}
              onClick=${() => setSection(s.key)}>${s.label}</button>
          `)}
        </div>
        <div className="modal-body">
          ${msg && html`<div className=${'badge ' + (msg.startsWith('✓') ? 'badge-success' : 'badge-error')} style=${{ display: 'block', marginBottom: '12px', padding: '10px' }}>${msg}</div>`}

          ${section === 'basic' && html`
            <div className="form-grid">
              <div><label className="label">Nama</label>
                <input className="input" value=${tool.name} onInput=${e => update('name', e.target.value)} /></div>
              <div><label className="label">Slug</label>
                <input className="input mono" value=${tool.slug || ''} onInput=${e => update('slug', e.target.value)} /></div>
              <div>
                <label className="label">Kategori</label>
                <select className="input" value=${tool.category_id}
                  onChange=${e => update('category_id', e.target.value) || update('subcategory_id', null)}>
                  ${categories.map(c => html`<option key=${c.id} value=${c.id}>${c.name}</option>`)}
                </select>
              </div>
              <div>
                <label className="label">Sub-kategori (opsional)</label>
                <select className="input" value=${tool.subcategory_id || ''}
                  onChange=${e => update('subcategory_id', e.target.value || null)}>
                  <option value="">— Tanpa sub-kategori —</option>
                  ${relevantSubs.map(s => html`<option key=${s.id} value=${s.id}>${s.name}</option>`)}
                </select>
                ${relevantSubs.length === 0 && html`
                  <p className="text-xs text-muted" style=${{ marginTop: '4px' }}>
                    Belum ada sub-kategori di laci ini. Tambah di tab "Laci / Kategori".
                  </p>
                `}
              </div>
              <div><label className="label">Label (opsional)</label>
                <input className="input" value=${tool.label || ''}
                  onInput=${e => update('label', e.target.value)} placeholder="new / featured" /></div>
            </div>
            <div><label className="label">Deskripsi singkat</label>
              <input className="input" value=${tool.description || ''}
                onInput=${e => update('description', e.target.value)} /></div>
            <div><label className="label">Deskripsi lengkap</label>
              <textarea className="input" rows="4" value=${tool.long_description || ''}
                onInput=${e => update('long_description', e.target.value)} /></div>
            <div><label className="label">Instruksi</label>
              <textarea className="input" rows="4" value=${tool.instructions || ''}
                onInput=${e => update('instructions', e.target.value)} /></div>
          `}

          ${section === 'visual' && html`
            <div><label className="label">Cover Image URL</label>
              <input className="input" value=${tool.cover_image || ''}
                onInput=${e => update('cover_image', e.target.value)} /></div>
            <div><label className="label">Icon (Lucide)</label>
              <input className="input mono" value=${tool.icon || ''}
                onInput=${e => update('icon', e.target.value)} placeholder="Sparkles" /></div>
            <div style=${{ marginTop: '20px' }}>
              <label className="label">Contoh Before/After</label>
              <p className="text-xs text-muted" style=${{ marginBottom: '12px' }}>Satu baris per pasangan: before_url,after_url</p>
              <textarea className="input mono" rows="4"
                value=${(tool.examples || []).map(e => `${e.before},${e.after}`).join('\n')}
                onInput=${e => {
                  const lines = e.target.value.split('\n').filter(Boolean);
                  update('examples', lines.map(l => {
                    const [before, after] = l.split(',').map(x => x?.trim());
                    return { before: before || '', after: after || '' };
                  }));
                }}
                placeholder="https://before.jpg,https://after.jpg" />
            </div>
          `}

          ${section === 'input' && html`
            <p className="text-xs text-muted" style=${{ marginBottom: '12px' }}>JSON array. Tipe: image, images, text, textarea, number, slider, checkbox, select.</p>
            <textarea className="input mono" rows="12" value=${JSON.stringify(tool.input_schema || [], null, 2)}
              onInput=${e => { try { update('input_schema', JSON.parse(e.target.value)); } catch {} }} />
            <div style=${{ marginTop: '16px' }}>
              <label className="label">Output Type</label>
              <select className="input" value=${tool.output_schema?.type || 'text'}
                onChange=${e => update('output_schema', { type: e.target.value })}>
                <option value="text">text</option><option value="image">image</option>
                <option value="images">images</option><option value="video">video</option>
                <option value="audio">audio</option><option value="json">json</option>
                <option value="files">files</option>
              </select>
            </div>
          `}

          ${section === 'pricing' && html`
            <div className="form-grid">
              <div><label className="label">Harga (credits)</label>
                <input className="input" type="number" min="0"
                  value=${tool.pricing?.credits ?? tool.credit_cost ?? 0}
                  onInput=${e => update('pricing', { ...(tool.pricing || {}), credits: Number(e.target.value), is_free: Number(e.target.value) === 0 })} /></div>
              <div><label className="label">Refund jika gagal?</label>
                <select className="input" value=${tool.pricing?.refund_on_fail !== false ? 'yes' : 'no'}
                  onChange=${e => update('pricing', { ...(tool.pricing || {}), refund_on_fail: e.target.value === 'yes' })}>
                  <option value="yes">Ya</option><option value="no">Tidak</option>
                </select></div>
            </div>
          `}

          ${section === 'publish' && html`
            <div style=${{ display: 'grid', gap: '12px' }}>
              <div><label className="label">Validation Status</label>
                <span className=${'badge badge-' + (VAL_BADGE[tool.validation_status] || 'default')}>
                  ${VAL_LABELS[tool.validation_status] || tool.validation_status}
                </span></div>
              <div><label className="label">Execution Handler</label>
                <code className="mono text-xs">${tool.execution_handler || '(none)'}</code></div>
              <div><label className="label">Requires Login</label>
                <select className="input" value=${tool.requires_login ? 'yes' : 'no'}
                  onChange=${e => update('requires_login', e.target.value === 'yes')}>
                  <option value="yes">Ya</option><option value="no">Tidak</option>
                </select></div>
            </div>
          `}
        </div>
        <div className="modal-actions">
          <${Button} variant="secondary" onClick=${onClose}>Tutup<//>
          <${Button} onClick=${save} disabled=${saving}>${saving ? 'Menyimpan...' : 'Simpan'}<//>
        </div>
      </div>
    </div>
  `;
}