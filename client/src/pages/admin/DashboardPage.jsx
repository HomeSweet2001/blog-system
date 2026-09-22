import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  FileText,
  FolderOpen,
  LayoutDashboard,
  PenSquare,
  Plus,
  TrendingUp,
} from "lucide-react";
import { apiStats } from "../../lib/api.js";
import { adminPaths } from "../../lib/urls.js";
import { useSettings } from "../../context/SettingsContext.jsx";
import { useBlog } from "../../context/BlogContext.jsx";
import { formatRelative } from "../../lib/markdown.js";
import { setPageTitle } from "../../lib/theme.js";
import { FullPageLoader } from "../../components/ui/Feedback.jsx";

function StatCard({ icon: Icon, label, value, hint, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-60">
            {label}
          </p>
          <p className="mt-2 font-heading text-3xl font-black">{value}</p>
          {hint && <p className="mt-1 text-xs opacity-60">{hint}</p>}
        </div>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-theme"
          style={{ background: `${color}22`, color }}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { settings } = useSettings();
  const { blog } = useBlog();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const blogId = blog?.id;
  const paths = adminPaths(blogId || 0);

  useEffect(() => {
    if (!blogId) return;
    setPageTitle("Painel");
    apiStats
      .get(blogId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [blogId]);

  if (error) {
    return (
      <div className="card p-6 text-sm text-red-600">
        Erro ao carregar estatisticas: {error}
      </div>
    );
  }
  if (!data) return <FullPageLoader label="Carregando painel..." />;

  const { totals, recent, byCategory } = data;
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-black">
            Olá, bem-vindo de volta.
          </h1>
          <p className="mt-1 text-sm opacity-70">
            Gerencie o conteúdo e a aparência de{" "}
            <strong>{settings.blog_name}</strong>.
          </p>
        </div>
        <Link to={paths.newPost} className="btn btn-primary">
          <Plus className="h-4 w-4" /> Nova publicação
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Publicações"
          value={totals.posts_total}
          hint={`${totals.posts_published} ${totals.posts_published === 1 ? "publicada" : "publicadas"} · ${totals.posts_draft} ${totals.posts_draft === 1 ? "rascunho" : "rascunhos"}`}
          color={settings.primary_color}
        />
        <StatCard
          icon={FolderOpen}
          label="Categorias"
          value={totals.categories_total}
          hint="Organização do conteúdo"
          color={settings.accent_color}
        />
        <StatCard
          icon={Eye}
          label="Visualizações"
          value={totals.views_total}
          hint="Total acumulado"
          color="#0ea5e9"
        />
        <StatCard
          icon={TrendingUp}
          label="Media por post"
          value={
            totals.posts_total
              ? Math.round(totals.views_total / totals.posts_total)
              : 0
          }
          hint="Visualizações por publicação"
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 font-heading text-lg font-bold">
              <LayoutDashboard className="h-4 w-4 opacity-60" /> Publicações
              recentes
            </h2>
            <Link
              to={paths.posts}
              className="text-xs font-semibold no-underline opacity-70 hover:opacity-100"
            >
              Ver todas
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">
              Nenhuma publicacao ainda. Crie a primeira!
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--c-border)" }}>
              {recent.map((post) => (
                <li key={post.id} className="flex items-center gap-3 py-3">
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{
                      background: post.category_color || "var(--c-border)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={paths.editPost(post.id)}
                      className="block truncate text-sm font-semibold no-underline hover:underline"
                    >
                      {post.title}
                    </Link>
                    <span className="text-xs opacity-60">
                      {post.category_name || "Sem categoria"} ·{" "}
                      {formatRelative(post.created_at)}
                    </span>
                  </div>
                  <span
                    className="chip shrink-0 text-[11px]"
                    style={
                      post.status === "published"
                        ? { background: "#10b98122", color: "#059669" }
                        : { background: "#f59e0b22", color: "#b45309" }
                    }
                  >
                    {post.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-heading text-lg font-bold">
            Posts por categoria
          </h2>
          {byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">Sem dados.</p>
          ) : (
            <ul className="space-y-4">
              {byCategory.map((cat) => (
                <li key={cat.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold">{cat.name}</span>
                    <span className="opacity-60">{cat.total}</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--c-surface)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(cat.total / maxCategory) * 100}%`,
                        background: cat.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link to={paths.categories} className="btn btn-ghost mt-6 w-full">
            <PenSquare className="h-4 w-4" /> Gerenciar categorias
          </Link>
        </section>
      </div>
    </div>
  );
}
