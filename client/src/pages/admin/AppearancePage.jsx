import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Eye,
  ExternalLink,
  GripVertical,
  Layout,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Type,
  Image as ImageIcon,
  Navigation,
  Code2,
  FolderTree,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useBlog } from '../../context/BlogContext.jsx';
import { apiBlogs, apiSettings } from '../../lib/api.js';
import { blogPaths } from '../../lib/urls.js';
import {
  applyTheme,
  setPageTitle,
  FONT_OPTIONS,
  TEMPLATES,
  COLOR_PRESETS,
} from '../../lib/theme.js';
import { TEMPLATE_ICONS } from '../../templates/Templates.jsx';
import ImageField from '../../components/ui/ImageField.jsx';
import ColorField from '../../components/ui/ColorField.jsx';
import { Alert, Spinner } from '../../components/ui/Feedback.jsx';

const TABS = [
  { id: 'identity', label: 'Identidade', icon: Sparkles },
  { id: 'banner', label: 'Banner', icon: ImageIcon },
  { id: 'colors', label: 'Cores', icon: Palette },
  { id: 'typography', label: 'Tipografia', icon: Type },
  { id: 'layout', label: 'Layout', icon: Layout },
  { id: 'navigation', label: 'Navegacao', icon: Navigation },
  { id: 'footer', label: 'Rodape & Redes', icon: Settings2 },
  { id: 'css', label: 'CSS customizado', icon: Code2 },
];

function Field({ label, hint, children }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs opacity-55">{hint}</p>}
    </div>
  );
}

function FontSelect({ label, value, onChange }) {
  return (
    <Field label={label}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {FONT_OPTIONS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
      <p className="mt-2 rounded-theme border px-3 py-3" style={{ borderColor: 'var(--c-border)' }}>
        <span className="text-xs opacity-60">Pre-visualizacao</span>
        <span className="mt-1 block text-xl font-bold" style={{ fontFamily: `'${value}', sans-serif` }}>
          O rato roeu a roupa do rei de Roma
        </span>
      </p>
    </Field>
  );
}

export default function AppearancePage() {
  const { settings } = useSettings();
  const { blog, storage, refresh } = useBlog();
  const blogId = blog?.id;
  const publicPaths = blogPaths(blog?.slug || '');
  const [tab, setTab] = useState('identity');
  const [draft, setDraft] = useState(settings);
  const [slugDraft, setSlugDraft] = useState(blog?.slug || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    setSlugDraft(blog?.slug || '');
  }, [blog?.slug]);

  // Mantem o rascunho sincronizado ate o primeiro ajuste do usuario.
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setPageTitle('Aparencia');
    return () => applyTheme(settingsRef.current);
  }, []);

  // Preview ao vivo: aplica o rascunho conforme o usuario edita.
  useEffect(() => {
    applyTheme(draft);
  }, [draft]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings) || slugDraft !== (blog?.slug || ''),
    [draft, settings]
  );

  function set(patch) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiSettings.update(blogId, {
        blog_name: draft.blog_name,
        tagline: draft.tagline,
        description: draft.description,
        logo_url: draft.logo_url,
        favicon_url: draft.favicon_url,
        banner_url: draft.banner_url,
        banner_title: draft.banner_title,
        banner_subtitle: draft.banner_subtitle,
        banner_overlay: Number(draft.banner_overlay),
        show_banner: draft.show_banner,
        primary_color: draft.primary_color,
        secondary_color: draft.secondary_color,
        accent_color: draft.accent_color,
        text_color: draft.text_color,
        background_color: draft.background_color,
        surface_color: draft.surface_color,
        border_color: draft.border_color,
        heading_font: draft.heading_font,
        body_font: draft.body_font,
        border_radius: Number(draft.border_radius),
        template: draft.template,
        posts_per_page: Number(draft.posts_per_page),
        show_sidebar: draft.show_sidebar,
        show_author: draft.show_author,
        navbar: draft.navbar,
        social_links: draft.social_links,
        footer_text: draft.footer_text,
        dark_mode: draft.dark_mode,
        custom_css: draft.custom_css,
      });

      // Nome e endereco ficam na tabela do blog (nao na aparencia).
      if (slugDraft !== blog.slug || draft.blog_name !== settings.blog_name) {
        await apiBlogs.update(blogId, { name: draft.blog_name, slug: slugDraft });
      }

      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('Restaurar a aparencia padrao? Suas personalizacoes serao perdidas.')) return;
    setSaving(true);
    try {
      await apiSettings.reset(blogId);
      const next = await refresh();
      setDraft(next?.settings || settings);
      setSlugDraft(next?.blog?.slug || blog.slug);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const navbar = Array.isArray(draft.navbar) ? draft.navbar : [];
  const social = Array.isArray(draft.social_links) ? draft.social_links : [];

  if (!blogId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-black">Aparencia do blog</h1>
          <p className="mt-1 text-sm opacity-70">
            Personalize identidade, cores, tipografia, template e navegacao. As alteracoes sao
            pre-visualizadas em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" target="_blank" className="btn btn-ghost">
            <Eye className="h-4 w-4" /> Abrir blog
          </Link>
          <button type="button" className="btn btn-ghost text-red-600" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" /> Restaurar
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="card h-fit p-2 lg:sticky lg:top-20">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-theme px-3 py-2.5 text-left text-sm font-semibold transition ${
                  tab === item.id ? 'text-white' : 'opacity-75 hover:opacity-100'
                }`}
                style={tab === item.id ? { background: 'var(--c-primary)' } : undefined}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-5">
          {/* ---------------------------- Identidade --------------------------- */}
          {tab === 'identity' && (
            <>
              <section className="card space-y-4 p-5">
                <h2 className="font-heading text-lg font-bold">Identidade do blog</h2>
                <Field label="Nome do blog">
                  <input
                    className="input"
                    value={draft.blog_name || ''}
                    onChange={(e) => set({ blog_name: e.target.value })}
                    maxLength={80}
                  />
                </Field>
                <Field label="Slogan / tagline">
                  <input
                    className="input"
                    value={draft.tagline || ''}
                    onChange={(e) => set({ tagline: e.target.value })}
                    maxLength={160}
                  />
                </Field>
                <Field label="Descricao" hint="Aparece no banner, rodape e nas meta tags do site.">
                  <textarea
                    className="input min-h-[90px] resize-y"
                    value={draft.description || ''}
                    onChange={(e) => set({ description: e.target.value })}
                    maxLength={400}
                  />
                </Field>
              </section>

              <section className="card space-y-4 p-5">
                <h2 className="font-heading text-lg font-bold">Endereco e imagens</h2>

                <Field
                  label="Endereco do blog (slug)"
                  hint="Alterar o endereco muda a URL do blog, mas NAO move as imagens ja enviadas."
                >
                  <div className="flex items-stretch gap-2">
                    <span
                      className="flex shrink-0 items-center rounded-theme border px-3 font-mono text-xs opacity-70"
                      style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
                    >
                      /b/
                    </span>
                    <input
                      className="input font-mono text-xs"
                      value={slugDraft}
                      placeholder="meu-blog"
                      onChange={(e) => {
                        setSlugDraft(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '-')
                            .replace(/-+/g, '-')
                        );
                        setSaved(false);
                      }}
                    />
                  </div>
                  <Link
                    to={publicPaths.home}
                    target="_blank"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold no-underline opacity-70 hover:opacity-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir /b/{slugDraft || 'meu-blog'}
                  </Link>
                </Field>

                <div
                  className="rounded-theme border px-4 py-4"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
                >
                  <span className="inline-flex flex-wrap items-center gap-2 text-sm font-bold">
                    <FolderTree className="h-4 w-4" /> Pasta de imagens
                    {storage?.label && (
                      <span
                        className="chip text-[11px] font-semibold"
                        style={{ background: 'var(--c-bg)', color: 'var(--c-primary)' }}
                      >
                        {storage.label}
                      </span>
                    )}
                  </span>
                  <p className="mt-1 text-xs opacity-70">
                    Todas as imagens deste blog (logo, favicon, banner, capas e imagens dos posts) sao
                    enviadas para uma pasta exclusiva, separada dos demais blogs.
                  </p>

                  <code
                    className="mt-3 block break-all rounded-theme border px-3 py-2 font-mono text-xs"
                    style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}
                  >
                    {storage?.blogFolder || `${storage?.baseFolder || 'blog-platform'}/${blog?.storage_folder || ''}`}/
                  </code>

                  <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {[
                      ['logo', 'Logo'],
                      ['favicon', 'Favicon'],
                      ['banner', 'Banner'],
                      ['posts', 'Capas e imagens dos posts'],
                      ['uploads', 'Outros envios'],
                    ].map(([tipo, rotulo]) => (
                      <div key={tipo} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: 'var(--c-primary)' }}
                        />
                        <span className="opacity-60">{rotulo}:</span>
                        <code className="truncate font-mono opacity-80">{tipo}/</code>
                      </div>
                    ))}
                  </div>

                  {storage?.warning && (
                    <p
                      className="mt-3 rounded-theme border px-3 py-2 text-xs leading-relaxed"
                      style={{
                        borderColor: '#fcd34d',
                        background: '#fffbeb',
                        color: '#92400e',
                      }}
                    >
                      <strong>Confira as credenciais do Cloudinary:</strong> {storage.warning}
                    </p>
                  )}

                  {storage?.driver === 'local' && (
                    <p className="mt-3 text-xs leading-relaxed text-amber-700">
                      <strong>Salvando no disco local do servidor.</strong> Perfeito para testar —
                      nenhuma conta externa necessaria. Ao publicar no Render, preencha as chaves
                      <code className="mx-1 rounded bg-black/10 px-1">CLOUDINARY_*</code>
                      para as imagens irem para a nuvem: o disco do Render nao persiste entre
                      deploys e as imagens seriam perdidas.
                    </p>
                  )}
                </div>
              </section>

              <section className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                <ImageField
                  label="Logo"
                  value={draft.logo_url}
                  onChange={(logo_url) => set({ logo_url })}
                  folder="logo"
                  hint="PNG com fundo transparente"
                  aspect="aspect-[3/1]"
                />
                <ImageField
                  label="Favicon"
                  value={draft.favicon_url}
                  onChange={(favicon_url) => set({ favicon_url })}
                  folder="favicon"
                  hint="Quadrado, 512x512"
                  aspect="aspect-square"
                />
              </section>
            </>
          )}

          {/* ------------------------------ Banner ----------------------------- */}
          {tab === 'banner' && (
            <>
              <section className="card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold">Imagem de banner</h2>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(draft.show_banner)}
                      onChange={(e) => set({ show_banner: e.target.checked })}
                    />
                    Exibir banner
                  </label>
                </div>

                <ImageField
                  label="Imagem de fundo"
                  value={draft.banner_url}
                  onChange={(banner_url) => set({ banner_url })}
                  folder="banner"
                  hint="Recomendado 1920x600 — se vazio usamos um gradiente com as cores do tema"
                />
              </section>

              <section className="card space-y-4 p-5">
                <h2 className="font-heading text-lg font-bold">Textos do banner</h2>
                <Field label="Titulo" hint="Se vazio, usamos o nome do blog.">
                  <input
                    className="input"
                    value={draft.banner_title || ''}
                    onChange={(e) => set({ banner_title: e.target.value })}
                    placeholder={draft.blog_name}
                  />
                </Field>
                <Field label="Subtitulo" hint="Se vazio, usamos o slogan.">
                  <input
                    className="input"
                    value={draft.banner_subtitle || ''}
                    onChange={(e) => set({ banner_subtitle: e.target.value })}
                    placeholder={draft.tagline}
                  />
                </Field>
                <Field label={`Escurecimento da imagem (${Math.round((draft.banner_overlay || 0) * 100)}%)`}>
                  <input
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.05"
                    className="w-full accent-[var(--c-primary)]"
                    value={draft.banner_overlay ?? 0.45}
                    onChange={(e) => set({ banner_overlay: Number(e.target.value) })}
                  />
                </Field>
              </section>
            </>
          )}

          {/* ------------------------------ Cores ------------------------------ */}
          {tab === 'colors' && (
            <>
              <section className="card p-5">
                <h2 className="mb-1 font-heading text-lg font-bold">Paletas prontas</h2>
                <p className="mb-4 text-sm opacity-65">
                  Clique em uma paleta para aplicar instantaneamente — voce pode ajustar cada cor
                  abaixo.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => set(preset.colors)}
                      className="card overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span
                        className="block h-14 w-full"
                        style={{
                          background: `linear-gradient(120deg, ${preset.colors.primary_color} 0%, ${preset.colors.accent_color} 100%)`,
                        }}
                      />
                      <span className="block px-3 py-2 text-xs font-bold">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField label="Cor primaria" value={draft.primary_color} onChange={(v) => set({ primary_color: v })} />
                <ColorField label="Cor secundaria" value={draft.secondary_color} onChange={(v) => set({ secondary_color: v })} />
                <ColorField label="Cor de destaque" value={draft.accent_color} onChange={(v) => set({ accent_color: v })} />
                <ColorField label="Texto" value={draft.text_color} onChange={(v) => set({ text_color: v })} />
                <ColorField label="Fundo" value={draft.background_color} onChange={(v) => set({ background_color: v })} />
                <ColorField label="Superficie (cards)" value={draft.surface_color} onChange={(v) => set({ surface_color: v })} />
                <ColorField label="Bordas" value={draft.border_color} onChange={(v) => set({ border_color: v })} />
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="mt-6 flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={Boolean(draft.dark_mode)}
                      onChange={(e) => set({ dark_mode: e.target.checked })}
                    />
                    <span className="text-sm">
                      <span className="font-semibold">Modo escuro</span>
                      <span className="block text-xs opacity-60">
                        Ativa ajustes de contraste para fundos escuros.
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            </>
          )}

          {/* --------------------------- Tipografia ---------------------------- */}
          {tab === 'typography' && (
            <section className="card grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
              <FontSelect
                label="Fonte dos titulos"
                value={draft.heading_font}
                onChange={(v) => set({ heading_font: v })}
              />
              <FontSelect
                label="Fonte do corpo do texto"
                value={draft.body_font}
                onChange={(v) => set({ body_font: v })}
              />
              <div className="sm:col-span-2">
                <Field label={`Arredondamento das bordas (${draft.border_radius}px)`}>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    className="w-full"
                    value={draft.border_radius}
                    onChange={(e) => set({ border_radius: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </section>
          )}

          {/* ------------------------------ Layout ----------------------------- */}
          {tab === 'layout' && (
            <>
              <section className="card p-5">
                <h2 className="mb-1 font-heading text-lg font-bold">Template da pagina inicial</h2>
                <p className="mb-4 text-sm opacity-65">
                  Escolha como as publicacoes sao apresentadas na home.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {TEMPLATES.map((tpl) => {
                    const active = draft.template === tpl.id;
                    const Icon = TEMPLATE_ICONS[tpl.id] || Layout;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => set({ template: tpl.id })}
                        className="card overflow-hidden p-0 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                        style={active ? { borderColor: 'var(--c-primary)', borderWidth: 2 } : undefined}
                      >
                        <TemplateThumbnail id={tpl.id} />
                        <div className="flex items-start gap-3 p-4">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-theme"
                            style={{
                              background: active ? 'var(--c-primary)' : 'var(--c-surface)',
                              color: active ? '#fff' : 'inherit',
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-bold">{tpl.name}</span>
                            <span className="block text-xs opacity-65">{tpl.description}</span>
                          </span>
                          {active && <Check className="ml-auto h-4 w-4" style={{ color: 'var(--c-primary)' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="card grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                <Field label="Publicacoes por pagina">
                  <select
                    className="input"
                    value={draft.posts_per_page}
                    onChange={(e) => set({ posts_per_page: Number(e.target.value) })}
                  >
                    {[3, 6, 9, 12, 16, 24].map((n) => (
                      <option key={n} value={n}>
                        {n} publicacoes
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="space-y-3 pt-6">
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(draft.show_sidebar)}
                      onChange={(e) => set({ show_sidebar: e.target.checked })}
                    />
                    <span className="font-semibold">Barra lateral</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={Boolean(draft.show_author)}
                      onChange={(e) => set({ show_author: e.target.checked })}
                    />
                    <span className="font-semibold">Exibir autor nas publicacoes</span>
                  </label>
                </div>
              </section>
            </>
          )}

          {/* ---------------------------- Navegacao ---------------------------- */}
          {tab === 'navigation' && (
            <section className="card space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold">Barra de navegacao</h2>
                  <p className="text-sm opacity-65">Links exibidos no topo do blog.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => set({ navbar: [...navbar, { label: '', url: '/' }] })}
                >
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>

              {navbar.length === 0 && (
                <p className="rounded-theme border border-dashed px-4 py-6 text-center text-sm opacity-60" style={{ borderColor: 'var(--c-border)' }}>
                  Nenhum link. Adicione itens como Inicio (/), Sobre (/sobre) ou uma URL externa.
                </p>
              )}

              <div className="space-y-2">
                {navbar.map((item, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2 rounded-theme border p-2" style={{ borderColor: 'var(--c-border)' }}>
                    <GripVertical className="h-4 w-4 shrink-0 opacity-30" />
                    <input
                      className="input flex-1"
                      placeholder="Rotulo"
                      value={item.label}
                      onChange={(e) => {
                        const next = [...navbar];
                        next[index] = { ...item, label: e.target.value };
                        set({ navbar: next });
                      }}
                    />
                    <input
                      className="input flex-1 font-mono text-xs"
                      placeholder="/ ou https://..."
                      value={item.url}
                      onChange={(e) => {
                        const next = [...navbar];
                        next[index] = { ...item, url: e.target.value };
                        set({ navbar: next });
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost h-9 w-9 !px-0"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...navbar];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          set({ navbar: next });
                        }}
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost h-9 w-9 !px-0"
                        disabled={index === navbar.length - 1}
                        onClick={() => {
                          const next = [...navbar];
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          set({ navbar: next });
                        }}
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost h-9 w-9 !px-0 text-red-600"
                        onClick={() => set({ navbar: navbar.filter((_, i) => i !== index) })}
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------- Rodape e Redes -------------------------- */}
          {tab === 'footer' && (
            <>
              <section className="card space-y-4 p-5">
                <h2 className="font-heading text-lg font-bold">Rodape</h2>
                <Field label="Texto do rodape">
                  <input
                    className="input"
                    value={draft.footer_text || ''}
                    onChange={(e) => set({ footer_text: e.target.value })}
                    placeholder="© 2025 Meu Blog"
                  />
                </Field>
              </section>

              <section className="card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-bold">Redes sociais</h2>
                    <p className="text-sm opacity-65">Links exibidos no rodape do blog.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => set({ social_links: [...social, { network: '', url: '' }] })}
                  >
                    <Plus className="h-4 w-4" /> Adicionar
                  </button>
                </div>

                {social.map((item, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <input
                      className="input w-40"
                      placeholder="Instagram"
                      value={item.network}
                      onChange={(e) => {
                        const next = [...social];
                        next[index] = { ...item, network: e.target.value };
                        set({ social_links: next });
                      }}
                    />
                    <input
                      className="input flex-1"
                      placeholder="https://instagram.com/..."
                      value={item.url}
                      onChange={(e) => {
                        const next = [...social];
                        next[index] = { ...item, url: e.target.value };
                        set({ social_links: next });
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost h-10 w-10 !px-0 text-red-600"
                      onClick={() => set({ social_links: social.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {social.length === 0 && (
                  <p className="rounded-theme border border-dashed px-4 py-6 text-center text-sm opacity-60" style={{ borderColor: 'var(--c-border)' }}>
                    Nenhuma rede social adicionada.
                  </p>
                )}
              </section>
            </>
          )}

          {/* ------------------------------- CSS ------------------------------- */}
          {tab === 'css' && (
            <section className="card space-y-4 p-5">
              <div>
                <h2 className="font-heading text-lg font-bold">CSS customizado</h2>
                <p className="text-sm opacity-65">
                  Avancado: escreva regras CSS que serao aplicadas a todo o blog. Voce pode usar as
                  variaveis <code className="rounded bg-black/10 px-1">--c-primary</code>,{' '}
                  <code className="rounded bg-black/10 px-1">--c-bg</code>,{' '}
                  <code className="rounded bg-black/10 px-1">--c-text</code>, etc.
                </p>
              </div>
              <textarea
                className="input min-h-[260px] resize-y font-mono text-xs"
                spellCheck={false}
                value={draft.custom_css || ''}
                onChange={(e) => set({ custom_css: e.target.value })}
                placeholder={'.post-card { box-shadow: 0 10px 30px rgba(0,0,0,.08); }'}
              />
            </section>
          )}
        </div>
      </div>

      {/* Barra de salvamento fixa */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--c-bg) 92%, transparent)', borderColor: 'var(--c-border)' }}
      >
        <div className="mx-auto flex max-w-content items-center justify-between gap-3">
          <span className="text-xs opacity-70">
            {dirty ? 'Voce tem alteracoes nao salvas.' : saved ? 'Tudo salvo.' : 'Nenhuma alteracao pendente.'}
          </span>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Salvo
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDraft(settings)}
              disabled={!dirty || saving}
            >
              Descartar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              Salvar alteracoes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- miniaturas do seletor de template -------------------- */

function TemplateThumbnail({ id }) {
  const base = 'h-24 w-full p-3';
  const bar = 'rounded bg-current opacity-15';

  const content = {
    classic: (
      <div className={base}>
        <div className="h-10 w-full rounded bg-current opacity-20" />
        <div className="mt-2 space-y-1.5">
          <div className={`${bar} h-2 w-3/4`} />
          <div className={`${bar} h-2 w-1/2`} />
        </div>
      </div>
    ),
    magazine: (
      <div className={base}>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="col-span-3 h-9 rounded bg-current opacity-25" />
          <div className="h-6 rounded bg-current opacity-15" />
          <div className="h-6 rounded bg-current opacity-15" />
          <div className="h-6 rounded bg-current opacity-15" />
        </div>
      </div>
    ),
    grid: (
      <div className={base}>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 rounded bg-current opacity-15" />
          ))}
        </div>
      </div>
    ),
    minimal: (
      <div className={`${base} flex flex-col justify-center gap-3`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className={`${bar} h-2 w-2/3`} />
            <div className={`${bar} h-1.5 w-full`} />
          </div>
        ))}
      </div>
    ),
  };

  return (
    <span className="block w-full" style={{ background: 'var(--c-surface)', color: 'var(--c-primary)' }}>
      {content[id] || content.classic}
    </span>
  );
}
