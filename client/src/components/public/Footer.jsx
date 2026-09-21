import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useBlog } from '../../context/BlogContext.jsx';
import { apiBlogs } from '../../lib/api.js';
import { blogPaths } from '../../lib/urls.js';
import BlogLogo from './BlogLogo.jsx';

export default function Footer() {
  const { settings } = useSettings();
  const { blog } = useBlog();
  const [categories, setCategories] = useState([]);

  const slug = blog?.slug || '';
  const paths = blogPaths(slug);

  useEffect(() => {
    if (!slug) return;
    apiBlogs
      .categories(slug)
      .then((data) => setCategories((data?.categories || []).slice(0, 6)))
      .catch(() => setCategories([]));
  }, [slug]);

  const social = Array.isArray(settings.social_links) ? settings.social_links : [];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <BlogLogo settings={settings} linkTo={paths.home} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-75">
            {settings.description || settings.tagline}
          </p>
        </div>

        {categories.length > 0 && (
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider opacity-60">Categorias</h4>
            <ul className="space-y-2 text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={paths.category(cat.slug)}
                    className="inline-flex items-center gap-2 no-underline opacity-80 transition hover:opacity-100"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                    {cat.name}
                    <span className="opacity-50">({cat.post_count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {social.length > 0 && (
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wider opacity-60">Redes sociais</h4>
            <ul className="space-y-2 text-sm">
              {social.map((item) => (
                <li key={`${item.network}-${item.url}`}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 no-underline opacity-80 transition hover:opacity-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {item.network || item.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        className="border-t px-4 py-5 text-center text-xs opacity-70 sm:px-6"
        style={{ borderColor: 'var(--c-border)' }}
      >
        {settings.footer_text || `© ${year} ${settings.blog_name}`} · {year} ·{' '}
        <Link to="/admin" className="underline">
          Painel
        </Link>{' '}
        ·{' '}
        <Link to="/" className="underline">
          Todos os blogs
        </Link>
      </div>
    </footer>
  );
}
