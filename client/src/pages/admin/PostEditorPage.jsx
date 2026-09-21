import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Eye, Save, Send, Trash2 } from 'lucide-react';
import { apiAdminCategories, apiAdminPosts } from '../../lib/api.js';
import { adminPaths, blogPaths } from '../../lib/urls.js';
import { useBlog } from '../../context/BlogContext.jsx';
import { setPageTitle } from '../../lib/theme.js';
import MarkdownEditor from '../../components/admin/MarkdownEditor.jsx';
import ImageField from '../../components/ui/ImageField.jsx';
import { Alert, Spinner } from '../../components/ui/Feedback.jsx';
import { toPlainText } from '../../lib/markdown.js';

const EMPTY = {
  title: '',
  slug: '',
  excerpt: '',
  excerpt_auto: true,
  content: '',
  cover_image: null,
  category_id: '',
  author: 'Admin',
  status: 'draft',
  featured: false,
  meta_title: '',
  meta_description: '',
};

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function PostEditorPage() {
  const { blog } = useBlog();
  const blogId = blog?.id;
  const paths = adminPaths(blogId || 0);
  const publicPaths = blogPaths(blog?.slug || '');
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [slugLocked, setSlugLocked] = useState(false);

  useEffect(() => {
    if (!blogId) return;
    setPageTitle(isEditing ? 'Editar publicacao' : 'Nova publicacao');
    apiAdminCategories
      .list(blogId)
      .then((data) => setCategories(data?.categories || []))
      .catch(() => {});
  }, [isEditing, blogId]);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    setLoading(true);
    apiAdminPosts
      .get(blogId, id)
      .then((data) => {
        if (cancelled) return;
        const p = data.post;
        setForm({
          title: p.title || '',
          slug: p.slug || '',
          excerpt: p.excerpt_auto ? '' : p.excerpt || '',
          excerpt_auto: p.excerpt_auto !== false,
          content: p.content || '',
          cover_image: p.cover_image || null,
          category_id: p.category_id ? String(p.category_id) : '',
          author: p.author || 'Admin',
          status: p.status || 'draft',
          featured: Boolean(p.featured),
          meta_title: p.meta_title || '',
          meta_description: p.meta_description || '',
        });
        setSlugLocked(true);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, isEditing, blogId]);

  const autoSlug = useMemo(() => slugify(form.title), [form.title]);

  function update(patch) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!slugLocked && 'title' in patch) next.slug = slugify(patch.title);
      return next;
    });
    setSuccess(null);
  }

  async function save(nextStatus) {
    setError(null);
    setSuccess(null);

    if (!form.title.trim()) {
      setError('O titulo e obrigatorio.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        status: nextStatus || form.status,
        category_id: form.category_id || null,
        slug: form.slug || autoSlug,
        // Resumo automatico vai VAZIO: quem gera e o servidor, que tambem
        // registra a origem (assim a pagina do post nao repete o inicio do texto).
        excerpt: form.excerpt_auto ? '' : form.excerpt,
      };

      const data = isEditing
        ? await apiAdminPosts.update(blogId, id, payload)
        : await apiAdminPosts.create(blogId, payload);

      setForm((prev) => ({
        ...prev,
        ...data.post,
        category_id: data.post.category_id ? String(data.post.category_id) : '',
        excerpt: data.post.excerpt_auto ? '' : data.post.excerpt || '',
        excerpt_auto: data.post.excerpt_auto !== false,
      }));
      setSuccess(
        payload.status === 'published' ? 'Publicacao salva e publicada!' : 'Rascunho salvo com sucesso!'
      );

      if (!isEditing) {
        navigate(paths.editPost(data.post.id), { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('Excluir esta publicacao definitivamente?')) return;
    setSaving(true);
    try {
      await apiAdminPosts.remove(blogId, id);
      navigate(paths.posts, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={paths.posts} className="btn btn-ghost h-9 w-9 !px-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-black">
              {isEditing ? 'Editar publicacao' : 'Nova publicacao'}
            </h1>
            <p className="text-xs opacity-60">
              {form.status === 'published' ? 'Publicada' : 'Rascunho'}
              {form.slug ? ` · /post/${form.slug}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditing && form.status === 'published' && (
            <a
              href={publicPaths.post(form.slug)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <Eye className="h-4 w-4" /> Ver
            </a>
          )}
          {isEditing && (
            <button type="button" onClick={remove} className="btn btn-ghost text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving}
            onClick={() => save('draft')}
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            Salvar rascunho
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => save('published')}
          >
            {saving ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {form.status === 'published' ? 'Atualizar' : 'Publicar'}
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4" /> {success}
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        {/* Coluna principal */}
        <div className="space-y-5">
          <div className="card space-y-4 p-5">
            <div>
              <label className="label" htmlFor="title">
                Titulo
              </label>
              <input
                id="title"
                className="input text-lg font-semibold"
                placeholder="Um titulo envolvente..."
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="slug">
                  Slug (URL)
                </label>
                <input
                  id="slug"
                  className="input font-mono text-xs"
                  placeholder={autoSlug || 'meu-post'}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugLocked(true);
                    update({ slug: slugify(e.target.value) });
                  }}
                />
              </div>
              <div>
                <label className="label" htmlFor="author">
                  Autor
                </label>
                <input
                  id="author"
                  className="input"
                  value={form.author}
                  onChange={(e) => update({ author: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label className="label !mb-0" htmlFor="excerpt">
                  Resumo (opcional)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={form.excerpt_auto}
                    onChange={(e) =>
                      update({ excerpt_auto: e.target.checked, excerpt: e.target.checked ? '' : form.excerpt })
                    }
                  />
                  Gerar automaticamente
                </label>
              </div>

              {form.excerpt_auto ? (
                <>
                  <div
                    className="rounded-theme border px-3 py-2 text-sm opacity-70"
                    style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
                  >
                    {toPlainText(form.content, 220) || (
                      <span className="opacity-60">
                        Comece a escrever o conteudo — o resumo aparece aqui.
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs opacity-55">
                    Gerado a partir do inicio do texto e usado nas listagens e na busca. Nao aparece
                    na pagina do post (seria repetir o comeco do conteudo).
                  </p>
                </>
              ) : (
                <>
                  <textarea
                    id="excerpt"
                    className="input min-h-[80px] resize-y"
                    placeholder="Escreva um resumo proprio, que sera exibido como introducao na pagina do post."
                    value={form.excerpt}
                    onChange={(e) => update({ excerpt: e.target.value })}
                  />
                  <p className="mt-1.5 text-xs opacity-55">
                    Aparece como introducao na pagina do post e tambem nas listagens.
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <span className="label">Conteudo</span>
            <MarkdownEditor
              value={form.content}
              onChange={(content) => update({ content })}
              placeholder="Escreva aqui... Use a barra acima para formatar, inserir links e enviar imagens."
            />
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide opacity-70">
              SEO
            </h2>
            <div>
              <label className="label" htmlFor="meta_title">
                Titulo para mecanismos de busca
              </label>
              <input
                id="meta_title"
                className="input"
                maxLength={200}
                placeholder={form.title}
                value={form.meta_title}
                onChange={(e) => update({ meta_title: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="meta_description">
                Descricao
              </label>
              <textarea
                id="meta_description"
                className="input min-h-[70px] resize-y"
                maxLength={300}
                placeholder={form.excerpt}
                value={form.meta_description}
                onChange={(e) => update({ meta_description: e.target.value })}
              />
              <span className="mt-1 block text-right text-xs opacity-50">
                {form.meta_description.length}/300
              </span>
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">
          <div className="card space-y-4 p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide opacity-70">
              Publicacao
            </h2>

            <div>
              <label className="label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="input"
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="category">
                Categoria
              </label>
              <select
                id="category"
                className="input"
                value={form.category_id}
                onChange={(e) => update({ category_id: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <Link
                to={paths.categories}
                className="mt-1.5 inline-block text-xs font-semibold no-underline opacity-70 hover:opacity-100"
              >
                Gerenciar categorias
              </Link>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-theme px-1 py-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.featured}
                onChange={(e) => update({ featured: e.target.checked })}
              />
              <span className="text-sm">
                <span className="font-semibold">Destacar</span>
                <span className="block text-xs opacity-60">Aparece primeiro na pagina inicial</span>
              </span>
            </label>
          </div>

          <div className="card p-5">
            <ImageField
              label="Imagem de capa"
              value={form.cover_image}
              onChange={(cover_image) => update({ cover_image })}
              folder="posts"
              hint="Recomendado 1200x630"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
