import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useBlog } from '../../context/BlogContext.jsx';
import { apiBlogs } from '../../lib/api.js';
import { blogPaths } from '../../lib/urls.js';
import { setPageTitle } from '../../lib/theme.js';
import Banner from '../../components/public/Banner.jsx';
import Pagination from '../../components/public/Pagination.jsx';
import TemplateRenderer from '../../templates/Templates.jsx';
import { EmptyState, FullPageLoader } from '../../components/ui/Feedback.jsx';

export default function HomePage({ mode = 'home' }) {
  const { settings } = useSettings();
  const { blog } = useBlog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ posts: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const slug = blog?.slug || '';
  const page = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const query = searchParams.get('q') || '';
  const limit = settings.posts_per_page || 6;
  const isSearch = mode === 'search';

  useEffect(() => {
    if (!slug) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = { page, limit };
    if (isSearch && query) params.search = query;

    apiBlogs
      .posts(slug, params)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setPageTitle(isSearch ? `Busca: ${query}` : page > 1 ? `Pagina ${page}` : null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [slug, page, limit, query, isSearch]);

  function goToPage(next) {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      {!isSearch && page === 1 && <Banner postCount={data.pagination?.total} />}

      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        {isSearch && (
          <header className="mb-8">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--c-primary)' }}
            >
              Resultados da busca
            </span>
            <h1 className="mt-1 font-heading text-2xl font-black sm:text-3xl">
              &ldquo;{query}&rdquo;
            </h1>
            {data.pagination && (
              <p className="mt-2 text-sm opacity-70">
                {data.pagination.total}{' '}
                {data.pagination.total === 1 ? 'publicacao encontrada' : 'publicacoes encontradas'}
              </p>
            )}
          </header>
        )}

        {loading ? (
          <FullPageLoader label="Carregando publicacoes..." />
        ) : error ? (
          <EmptyState icon={FileText} title="Nao foi possivel carregar" description={error} />
        ) : data.posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={isSearch ? 'Nenhum resultado encontrado' : 'Nenhuma publicacao ainda'}
            description={
              isSearch
                ? 'Tente outras palavras-chave.'
                : 'Assim que a primeira publicacao for criada no painel, ela aparece aqui.'
            }
          />
        ) : (
          <>
            <TemplateRenderer template={settings.template} posts={data.posts} />
            <Pagination pagination={data.pagination} onPage={goToPage} />
          </>
        )}
      </div>
    </>
  );
}
