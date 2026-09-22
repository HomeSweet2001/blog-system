import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { apiAdminCategories, apiAdminPosts } from "../../lib/api.js";
import { adminPaths, blogPaths } from "../../lib/urls.js";
import { useBlog } from "../../context/BlogContext.jsx";
import { formatDate } from "../../lib/markdown.js";
import { setPageTitle } from "../../lib/theme.js";
import {
  Alert,
  EmptyState,
  FullPageLoader,
  Spinner,
} from "../../components/ui/Feedback.jsx";
import Pagination from "../../components/public/Pagination.jsx";

export default function PostsPage() {
  const { blog } = useBlog();
  const blogId = blog?.id;
  const paths = adminPaths(blogId || 0);
  const publicPaths = blogPaths(blog?.slug || "");

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    category: "",
    search: "",
    page: 1,
  });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!blogId) return;
    setLoading(true);
    setError(null);
    try {
      const params = { page: filters.page, limit: 12 };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;

      const data = await apiAdminPosts.list(blogId, params);
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, blogId]);

  useEffect(() => {
    if (!blogId) return;
    setPageTitle("Publicações");
    apiAdminCategories
      .list(blogId)
      .then((data) => setCategories(data?.categories || []))
      .catch(() => {});
  }, [blogId]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function toggleStatus(post) {
    setBusyId(post.id);
    try {
      await apiAdminPosts.setStatus(
        blogId,
        post.id,
        post.status === "published" ? "draft" : "published",
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id) {
    setBusyId(id);
    try {
      await apiAdminPosts.remove(blogId, id);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-black">Publicações</h1>
          <p className="mt-1 text-sm opacity-70">
            {pagination ? `${pagination.total} no total` : "Carregando..."}
          </p>
        </div>
        <Link to={paths.newPost} className="btn btn-primary">
          <Plus className="h-4 w-4" /> Nova publicacao
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="card p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
            <input
              className="input pl-9"
              placeholder="Buscar por titulo..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
              }
            />
          </div>
          <select
            className="input"
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
            }
          >
            <option value="all">Todos os status</option>
            <option value="published">Publicados</option>
            <option value="draft">Rascunhos</option>
          </select>
          <select
            className="input"
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))
            }
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <FullPageLoader label="Carregando publicações..." />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma publicacao encontrada"
          description="Ajuste os filtros ou crie a primeira publicacao do blog."
          action={
            <Link to={paths.newPost} className="btn btn-primary">
              <Plus className="h-4 w-4" /> Criar publicacao
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead style={{ background: "var(--c-surface)" }}>
                <tr className="text-left text-xs uppercase tracking-wider opacity-70">
                  <th className="px-4 py-3 font-bold">Titulo</th>
                  <th className="px-4 py-3 font-bold">Categoria</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Views</th>
                  <th className="px-4 py-3 font-bold">Data</th>
                  <th className="px-4 py-3 text-right font-bold">Acoes</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--c-border)" }}
              >
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="transition hover:bg-black/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {post.cover_image ? (
                          <img
                            src={post.cover_image}
                            alt=""
                            className="h-9 w-12 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-9 w-12 shrink-0 items-center justify-center rounded text-xs font-bold opacity-50"
                            style={{ background: "var(--c-surface)" }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={paths.editPost(post.id)}
                            className="block truncate font-semibold no-underline hover:underline"
                          >
                            {post.title}
                          </Link>
                          {post.featured && (
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: "var(--c-accent)" }}
                            >
                              ★ Destaque
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {post.category_name ? (
                        <span
                          className="chip text-[11px]"
                          style={{
                            background: `${post.category_color}22`,
                            color: post.category_color,
                          }}
                        >
                          {post.category_name}
                        </span>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="chip text-[11px]"
                        style={
                          post.status === "published"
                            ? { background: "#10b98122", color: "#059669" }
                            : { background: "#f59e0b22", color: "#b45309" }
                        }
                      >
                        {post.status === "published" ? "Publicado" : "Rascunho"}
                      </span>
                    </td>
                    <td className="px-4 py-3 opacity-70">{post.views}</td>
                    <td className="px-4 py-3 opacity-70">
                      {formatDate(post.published_at || post.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {busyId === post.id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <>
                            <Link
                              to={paths.editPost(post.id)}
                              className="btn btn-ghost h-8 w-8 !px-0"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              className="btn btn-ghost h-8 w-8 !px-0"
                              title={
                                post.status === "published"
                                  ? "Despublicar"
                                  : "Publicar"
                              }
                              onClick={() => toggleStatus(post)}
                            >
                              {post.status === "published" ? (
                                <Undo2 className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </button>
                            {post.status === "published" && (
                              <a
                                href={publicPaths.post(post.slug)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost h-8 w-8 !px-0"
                                title="Ver no blog"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost h-8 w-8 !px-0 text-red-600"
                              title="Excluir"
                              onClick={() => setConfirmDelete(post)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            className="card w-full max-w-sm p-6"
            style={{ background: "var(--c-bg)" }}
          >
            <h3 className="font-heading text-lg font-bold">
              Excluir publicacao
            </h3>
            <p className="mt-2 text-sm opacity-75">
              Tem certeza que deseja excluir{" "}
              <strong>{confirmDelete.title}</strong>? Esta acao nao pode ser
              desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white"
                onClick={() => remove(confirmDelete.id)}
                disabled={busyId === confirmDelete.id}
              >
                {busyId === confirmDelete.id ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
