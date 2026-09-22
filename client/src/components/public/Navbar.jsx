import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Lock, Menu, Search, X } from "lucide-react";
import { useSettings } from "../../context/SettingsContext.jsx";
import { useBlog } from "../../context/BlogContext.jsx";
import { blogPaths, resolveNavUrl } from "../../lib/urls.js";
import BlogLogo from "./BlogLogo.jsx";

export default function Navbar() {
  const { settings } = useSettings();
  const { blog } = useBlog();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const slug = blog?.slug || "";
  const paths = blogPaths(slug);
  const links = Array.isArray(settings.navbar) ? settings.navbar : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    const q = term.trim();
    setSearchOpen(false);
    setOpen(false);
    navigate(q ? paths.search(q) : paths.home);
  }

  const linkClass = ({ isActive }) =>
    `rounded-theme px-3 py-2 text-sm font-semibold no-underline transition ${
      isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
    }`;

  const linkStyle = ({ isActive }) =>
    isActive ? { color: "var(--c-primary)" } : undefined;

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur transition-shadow ${
        scrolled ? "shadow-sm" : ""
      }`}
      style={{
        background: "color-mix(in srgb, var(--c-bg) 88%, transparent)",
        borderColor: "var(--c-border)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
        <BlogLogo settings={settings} linkTo={paths.home} />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((item) => {
            const { to, external } = resolveNavUrl(item.url, slug);

            if (external) {
              return (
                <a
                  key={`${item.label}-${item.url}`}
                  href={to}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel="noreferrer"
                  className="rounded-theme px-3 py-2 text-sm font-semibold no-underline opacity-70 transition hover:opacity-100"
                >
                  {item.label}
                </a>
              );
            }

            return (
              <NavLink
                key={`${item.label}-${item.url}`}
                to={to}
                end={to === paths.home}
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noreferrer" : undefined}
                className={linkClass}
                style={linkStyle}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="btn btn-ghost h-10 w-10 !px-0"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/admin"
            className="btn btn-ghost hidden h-10 !px-3 sm:inline-flex"
            title="Área administrativa"
          >
            <Lock className="h-4 w-4" />
            <span className="hidden lg:inline">Admin</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-ghost h-10 w-10 !px-0 md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div
          className="border-t px-4 py-3 sm:px-6"
          style={{ borderColor: "var(--c-border)" }}
        >
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-content gap-2"
          >
            <input
              autoFocus
              className="input"
              placeholder="Buscar publicacoes..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Buscar
            </button>
          </form>
        </div>
      )}

      {open && (
        <nav
          className="border-t px-4 py-3 md:hidden"
          style={{ borderColor: "var(--c-border)", background: "var(--c-bg)" }}
        >
          <div className="flex flex-col">
            {links.map((item) => {
              const { to, external } = resolveNavUrl(item.url, slug);
              return external ? (
                <a
                  key={`${item.label}-${item.url}`}
                  href={to}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="rounded-theme px-3 py-3 text-sm font-semibold no-underline opacity-80"
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={`${item.label}-${item.url}`}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="rounded-theme px-3 py-3 text-sm font-semibold no-underline opacity-80"
                >
                  {item.label}
                </NavLink>
              );
            })}
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-theme px-3 py-3 text-sm font-semibold no-underline opacity-80"
            >
              Área administrativa
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
