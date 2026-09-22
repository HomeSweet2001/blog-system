import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { apiAdminCategories } from "../../lib/api.js";
import { blogPaths } from "../../lib/urls.js";
import { useBlog } from "../../context/BlogContext.jsx";
import { setPageTitle } from "../../lib/theme.js";
import ColorField from "../../components/ui/ColorField.jsx";
import {
  Alert,
  EmptyState,
  FullPageLoader,
  Spinner,
} from "../../components/ui/Feedback.jsx";

const EMPTY = { name: "", slug: "", description: "", color: "#6366f1" };

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function CategoriesPage() {
  const { blog } = useBlog();
  const blogId = blog?.id;
  const publicPaths = blogPaths(blog?.slug || "");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { id?, ...form }
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    if (!blogId) return;
    setLoading(true);
    try {
      const data = await apiAdminCategories.list(blogId);
      setCategories(data?.categories || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPageTitle("Categorias");
    load();
  }, [blogId]);

  async function submit(e) {
    e.preventDefault();
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: editing.name,
        slug: editing.slug || slugify(editing.name),
        description: editing.description,
        color: editing.color,
      };
      if (editing.id)
        await apiAdminCategories.update(blogId, editing.id, payload);
      else await apiAdminCategories.create(blogId, payload);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(category) {
    if (
      !window.confirm(
        `Excluir a categoria "${category.name}"? Os posts ficarao sem categoria.`,
      )
    )
      return;
    setBusyId(category.id);
    try {
      await apiAdminCategories.remove(blogId, category.id);
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
          <h1 className="font-heading text-2xl font-black">Categorias</h1>
          <p className="mt-1 text-sm opacity-70">
            Organize as publicações do blog.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing({ ...EMPTY })}
        >
          <Plus className="h-4 w-4" /> Nova categoria
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <FullPageLoader />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          description="Crie categorias para organizar suas publicações."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-theme text-lg font-black text-white"
                  style={{ background: cat.color }}
                >
                  {cat.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost h-8 w-8 !px-0"
                    onClick={() => setEditing({ ...cat })}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost h-8 w-8 !px-0 text-red-600"
                    onClick={() => remove(cat)}
                    disabled={busyId === cat.id}
                    title="Excluir"
                  >
                    {busyId === cat.id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-base font-bold">{cat.name}</h3>
                <p className="font-mono text-xs opacity-50">/{cat.slug}</p>
              </div>

              {cat.description && (
                <p className="text-sm opacity-70">{cat.description}</p>
              )}

              <div className="mt-auto flex items-center justify-between text-xs opacity-60">
                <span>
                  {cat.post_count}{" "}
                  {cat.post_count === 1 ? "publicacao" : "publicacoes"}
                </span>
                <Link
                  to={publicPaths.category(cat.slug)}
                  target="_blank"
                  className="font-semibold no-underline hover:underline"
                >
                  Ver no blog
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <form
            onSubmit={submit}
            className="card max-h-full w-full max-w-md space-y-4 overflow-y-auto p-6"
            style={{ background: "var(--c-bg)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">
                {editing.id ? "Editar categoria" : "Nova categoria"}
              </h3>
              <button
                type="button"
                className="btn btn-ghost h-8 w-8 !px-0"
                onClick={() => setEditing(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="label">Nome</label>
              <input
                autoFocus
                className="input"
                value={editing.name}
                onChange={(e) =>
                  setEditing((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                maxLength={80}
              />
            </div>

            <div>
              <label className="label">Slug (URL)</label>
              <input
                className="input font-mono text-xs"
                placeholder={slugify(editing.name) || "nome-da-categoria"}
                value={editing.slug || ""}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
                    slug: slugify(e.target.value),
                  }))
                }
              />
            </div>

            <div>
              <label className="label">Descricao</label>
              <textarea
                className="input min-h-[70px] resize-y"
                maxLength={300}
                value={editing.description || ""}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <ColorField
              label="Cor"
              value={editing.color}
              onChange={(color) => setEditing((prev) => ({ ...prev, color }))}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? <Spinner className="h-4 w-4" /> : null}
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
