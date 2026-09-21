import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Plus,
  Settings,
  Tags,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { BlogProvider, useBlog } from '../../context/BlogContext.jsx';
import { apiBlogs } from '../../lib/api.js';
import { adminPaths, blogPaths } from '../../lib/urls.js';
import { FullPageLoader } from '../ui/Feedback.jsx';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Verificando sessao..." />;
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return children ?? <Outlet />;
}

/* ------------------------------ seletor de blog ---------------------------- */

function BlogSwitcher({ currentId }) {
  const [blogs, setBlogs] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    apiBlogs
      .list()
      .then((data) => setBlogs(data?.blogs || []))
      .catch(() => setBlogs([]));
  }, [currentId]);

  if (blogs.length === 0) return null;

  const current = blogs.find((b) => b.id === currentId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost w-full justify-between !px-3"
      >
        <span className="truncate text-left">
          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-50">
            Blog atual
          </span>
          <span className="block truncate text-sm font-semibold">
            {current ? current.name : 'Selecionar blog'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-theme border shadow-xl"
            style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}
          >
            {blogs.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(adminPaths(b.id).home);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:opacity-80"
                style={{
                  background: b.id === currentId ? 'var(--c-surface)' : 'transparent',
                }}
              >
                <span
                  className="h-6 w-1.5 shrink-0 rounded-full"
                  style={{ background: b.primary_color || 'var(--c-border)' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="block truncate text-[11px] opacity-60">
                    {b.posts_published} publicada(s) · /b/{b.slug}
                  </span>
                </span>
              </button>
            ))}

            <Link
              to="/admin/blogs/novo"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 border-t px-3 py-2.5 text-sm font-semibold no-underline"
              style={{ borderColor: 'var(--c-border)' }}
            >
              <Plus className="h-3.5 w-3.5" /> Criar novo blog
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------- casca do painel -------------------------- */

function AdminShell({ blogId }) {
  const { user, logout } = useAuth();
  const { blog, loading, error } = useBlog();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const path = blogId ? adminPaths(blogId) : null;

  const inBlog = Boolean(blogId);

  const blogNav = path
    ? [
        { to: path.home, label: 'Painel', icon: LayoutDashboard, end: true },
        { to: path.posts, label: 'Publicacoes', icon: FileText },
        { to: path.categories, label: 'Categorias', icon: Tags },
        { to: path.appearance, label: 'Aparencia', icon: Palette },
      ]
    : [];

  const globalNav = [
    { to: '/admin', label: 'Meus blogs', icon: FolderKanban, end: true },
    { to: '/admin/conta', label: 'Minha conta', icon: Settings, end: false },
  ];

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  // Blog inexistente (id invalido na URL)
  if (inBlog && !loading && error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-black">Blog nao encontrado</h1>
        <p className="mt-2 text-sm opacity-70">{error}</p>
        <Link to="/admin" className="btn btn-primary mt-6">
          Voltar para meus blogs
        </Link>
      </div>
    );
  }

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-theme px-3 py-2.5 text-sm font-semibold no-underline transition ${
          isActive ? 'text-white' : 'hover:opacity-80'
        }`
      }
      style={({ isActive }) =>
        isActive ? { background: 'var(--c-primary)' } : { color: 'var(--c-text)' }
      }
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--c-surface)' }}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}
      >
        <div
          className="flex h-16 items-center justify-between border-b px-4"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <Link to="/admin" className="flex items-center gap-2.5 no-underline">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-theme text-sm font-black text-white"
              style={{ background: 'var(--c-primary)' }}
            >
              B
            </span>
            <span className="text-sm font-extrabold leading-tight">
              Blog Platform
              <span className="block text-[11px] font-medium opacity-60">Painel de controle</span>
            </span>
          </Link>
          <button
            type="button"
            className="btn btn-ghost h-8 w-8 !px-0 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <BlogSwitcher currentId={blogId} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {inBlog && (
            <>
              {blogNav.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
              <div className="my-2 border-t" style={{ borderColor: 'var(--c-border)' }} />
            </>
          )}

          {globalNav.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t p-3" style={{ borderColor: 'var(--c-border)' }}>
          {inBlog && blog && (
            <Link
              to={blogPaths(blog.slug).home}
              target="_blank"
              className="flex items-center gap-3 rounded-theme px-3 py-2.5 text-sm font-semibold no-underline opacity-70 hover:opacity-100"
            >
              <ExternalLink className="h-4 w-4" /> Ver o blog
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-theme px-3 py-2.5 text-sm font-semibold opacity-70 transition hover:opacity-100"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        {user && (
          <div
            className="mx-3 mb-3 rounded-theme px-3 py-2.5 text-xs"
            style={{ background: 'var(--c-surface)' }}
          >
            <span className="block font-semibold">{user.username}</span>
            <span className="opacity-60">Administrador</span>
          </div>
        )}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 sm:px-6"
          style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}
        >
          <button
            type="button"
            className="btn btn-ghost h-9 w-9 !px-0 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <h1 className="truncate text-sm font-bold opacity-70">
            {inBlog && blog ? blog.slug : 'Area administrativa'}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            {inBlog && blog && (
              <Link to={blogPaths(blog.slug).home} className="btn btn-ghost hidden sm:inline-flex">
                <ExternalLink className="h-4 w-4" /> Ver blog
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Descobre o blog pela URL (/admin/b/:id) e injeta o contexto.
 * A `key` forca remontar tudo ao trocar de blog, evitando estado antigo na tela.
 */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const match = pathname.match(/^\/admin\/b\/(\d+)(?:\/|$)/);
  const blogId = match ? Number.parseInt(match[1], 10) : null;

  return (
    <BlogProvider mode="id" identifier={blogId} key={blogId ?? 'sem-blog'}>
      <AdminShell blogId={blogId} />
    </BlogProvider>
  );
}
