import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, BookOpen, FileText, Lock, PenSquare } from "lucide-react";
import { apiBlogs } from "../../lib/api.js";
import { blogPaths } from "../../lib/urls.js";
import { setPageTitle } from "../../lib/theme.js";
import { EmptyState, FullPageLoader } from "../../components/ui/Feedback.jsx";

function BlogCard({ blog }) {
  const accent = blog.primary_color || "#6366f1";
  const paths = blogPaths(blog.slug);

  return (
    <Link
      to={paths.home}
      className="card group flex flex-col overflow-hidden no-underline transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-32 w-full overflow-hidden">
        {blog.banner_url ? (
          <img
            src={blog.banner_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(120deg, ${accent}, ${blog.secondary_color || "#0f172a"})`,
            }}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          {blog.logo_url ? (
            <img
              src={blog.logo_url}
              alt=""
              className="h-9 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-theme text-sm font-black text-white"
              style={{ background: accent }}
            >
              {(blog.name || "B").charAt(0).toUpperCase()}
            </span>
          )}
          <h2 className="font-heading text-lg font-bold">{blog.name}</h2>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-sm opacity-70">
          {blog.description || blog.tagline || "Sem descricao."}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs opacity-60">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {blog.post_count}{" "}
            {blog.post_count === 1 ? "publicação" : "publicações"}
          </span>
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: accent }}
          >
            Abrir <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogsLandingPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPageTitle("Blogs");
    apiBlogs
      .listPublic()
      .then((data) => setBlogs(data?.blogs || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Com um unico blog, entra direto nele — evita um clique desnecessario.
  if (!loading && !error && blogs.length === 1) {
    return <Navigate to={blogPaths(blogs[0].slug).home} replace />;
  }

  if (loading) return <FullPageLoader label="Carregando blogs..." />;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--c-bg)", color: "var(--c-text)" }}
    >
      <div
        className="border-b px-4 py-16 sm:px-6"
        style={{
          borderColor: "var(--c-border)",
          background:
            "linear-gradient(140deg, var(--c-primary), var(--c-secondary) 90%)",
        }}
      >
        <div className="mx-auto max-w-content text-center text-white">
          <h1 className="inline-flex items-center gap-3 font-heading text-3xl font-black sm:text-4xl">
            <BookOpen className="h-8 w-8" /> Nossos blogs
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm opacity-90 sm:text-base">
            Escolha um blog para ler. Cada um tem sua propria identidade,
            categorias e publicações.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        {error ? (
          <EmptyState
            icon={BookOpen}
            title="Nao foi possivel carregar"
            description={error}
          />
        ) : blogs.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhum blog criado ainda"
            description="Entre no painel administrativo para criar o primeiro blog."
            action={
              <Link to="/admin" className="btn btn-primary">
                <PenSquare className="h-4 w-4" /> Ir para o painel
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold underline opacity-60 hover:opacity-100"
          >
            <Lock className="h-3.5 w-3.5" /> Area administrativa
          </Link>
        </div>
      </div>
    </div>
  );
}
