import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  Eye as EyeIcon,
  FileText,
  FolderKanban,
  FolderTree,
  Plus,
  Settings,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { apiBlogs } from '../../lib/api.js';
import { adminPaths, blogPaths } from '../../lib/urls.js';
import { setPageTitle } from '../../lib/theme.js';
import { Alert, EmptyState, FullPageLoader, Spinner } from '../../components/ui/Feedback.jsx';

const EMPTY_FORM = { name: '', slug: '' };

function slugPreview(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/* -------------------------- modal de criacao de blog ----------------------- */
function CreateBlogModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiBlogs.create({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
      });
      onCreated(data.blog);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <form
        onSubmit={submit}
        className="card max-h-full w-full max-w-md space-y-4 overflow-y-auto p-6"
        style={{ background: 'var(--c-bg)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Criar novo blog</h2>
          <button type="button" className="btn btn-ghost h-8 w-8 !px-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="label" htmlFor="blog-name">
            Nome do blog
          </label>
          <input
            id="blog-name"
            autoFocus
            className="input"
            placeholder="Ex.: Receitas da Vovo"
            value={form.name}
            maxLength={80}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="blog-slug">
            Endereco (opcional)
          </label>
          <input
            id="blog-slug"
            className="input font-mono text-xs"
            placeholder={slugPreview(form.name) || 'receitas-da-vovo'}
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: slugPreview(e.target.value) }))}
          />
          <p className="mt-1.5 text-xs opacity-60">
            O blog ficara em <code>/b/{form.slug || slugPreview(form.name) || 'nome-do-blog'}</code>
          </p>
        </div>

        <div
          className="rounded-theme border px-3 py-3 text-xs opacity-75"
          style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
        >
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <FolderTree className="h-3.5 w-3.5" /> Pastas de imagem
          </span>
          <p className="mt-1">
            Todas as imagens deste blog serao guardadas em uma pasta exclusiva no Cloudinary, criada
            automaticamente.
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
            {saving ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Criar blog
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------ card de blog ------------------------------- */
function BlogCard({ blog, onDelete }) {
  const accent = blog.primary_color || '#6366f1';
  const paths = adminPaths(blog.id);

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme text-lg font-black text-white"
            style={{ background: accent }}
          >
            {(blog.name || 'B').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-bold">{blog.name}</h2>
            <Link
              to={blogPaths(blog.slug).home}
              target="_blank"
              className="block truncate font-mono text-[11px] no-underline opacity-55 hover:opacity-100"
            >
              /b/{blog.slug}
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost h-8 w-8 !px-0 text-red-600"
          title="Excluir blog"
          onClick={() => onDelete(blog)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Publicadas', value: blog.posts_published, icon: FileText },
          { label: 'Rascunhos', value: blog.posts_total - blog.posts_published, icon: FileText },
          { label: 'Categorias', value: blog.categories_total, icon: Tags },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-theme px-2 py-2"
            style={{ background: 'var(--c-surface)' }}
          >
            <span className="block font-heading text-lg font-black">{s.value}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-55">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs opacity-60">
        <span className="inline-flex items-center gap-1.5">
          <FolderTree className="h-3.5 w-3.5" /> pasta: {blog.storage_folder}
        </span>
        <span className="inline-flex items-center gap-1">
          <EyeIcon className="h-3.5 w-3.5" /> {blog.views_total}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={paths.home} className="btn btn-primary flex-1">
          <Settings className="h-4 w-4" /> Gerenciar
        </Link>
        <Link to={paths.posts} className="btn btn-ghost">
          <FileText className="h-4 w-4" /> Posts
        </Link>
        <Link to={paths.appearance} className="btn btn-ghost">
          <Eye className="h-4 w-4" /> Aparencia
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------- pagina --------------------------------- */
export default function BlogsPage({ openCreate = false }) {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(openCreate);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteImages, setDeleteImages] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiBlogs.list();
      setBlogs(data?.blogs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPageTitle('Meus blogs');
    load();
  }, []);

  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await apiBlogs.remove(confirmDelete.id, deleteImages);
      setConfirmDelete(null);
      setDeleteImages(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-black">Meus blogs</h1>
          <p className="mt-1 text-sm opacity-70">
            Cada blog tem aparencia, categorias e publicacoes independentes — e uma pasta exclusiva
            de imagens.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo blog
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <FullPageLoader label="Carregando blogs..." />
      ) : blogs.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum blog ainda"
          description="Crie o primeiro blog para comecar a publicar."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Criar blog
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} onDelete={setConfirmDelete} />
          ))}
        </div>
      )}

      {creating && (
        <CreateBlogModal
          onClose={() => {
            setCreating(false);
            if (openCreate) navigate('/admin', { replace: true });
          }}
          onCreated={(blog) => {
            setCreating(false);
            navigate(adminPaths(blog.id).home);
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="card w-full max-w-md space-y-4 p-6" style={{ background: 'var(--c-bg)' }}>
            <h3 className="font-heading text-lg font-bold">Excluir blog</h3>
            <p className="text-sm opacity-75">
              Tem certeza que deseja excluir <strong>{confirmDelete.name}</strong>? Todas as
              publicacoes e categorias dele serao apagadas. Esta acao nao pode ser desfeita.
            </p>

            <label
              className="flex cursor-pointer items-start gap-3 rounded-theme border px-3 py-3"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={deleteImages}
                onChange={(e) => setDeleteImages(e.target.checked)}
              />
              <span className="text-xs">
                <span className="font-semibold">Excluir tambem as imagens do Cloudinary</span>
                <span className="block opacity-70">
                  Remove a pasta <code>{confirmDelete.storage_folder}</code> e todas as imagens
                  dentro dela. Se deixar desmarcado, as imagens permanecem no Cloudinary.
                </span>
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteImages(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white"
                onClick={remove}
                disabled={busy}
              >
                {busy ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
