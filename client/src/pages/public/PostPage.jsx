import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Check, Clock, Eye, Link2, Share2, Tag, FileText, Home } from 'lucide-react';
import { apiBlogs } from '../../lib/api.js';
import { useBlog } from '../../context/BlogContext.jsx';
import { blogPaths } from '../../lib/urls.js';
import { formatDate, readingTime, renderMarkdown } from '../../lib/markdown.js';
import { setPageTitle } from '../../lib/theme.js';
import PostCard from '../../components/public/PostCard.jsx';
import { EmptyState, FullPageLoader } from '../../components/ui/Feedback.jsx';

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function PostPage() {
  const { slug } = useParams();
  const { blog } = useBlog();
  const blogSlug = blog?.slug || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const paths = blogPaths(blogSlug);

  useEffect(() => {
    if (!blogSlug || !slug) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    apiBlogs
      .post(blogSlug, slug)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setPageTitle(res.post.meta_title || res.post.title);
        setMeta('description', res.post.meta_description || res.post.excerpt);
        setMeta('og:title', res.post.title);
        if (res.post.cover_image) setMeta('og:image', res.post.cover_image);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [blogSlug, slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (loading) return <FullPageLoader label="Abrindo publicacao..." />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <EmptyState
          icon={Tag}
          title="Publicacao nao encontrada"
          description={error || 'Este conteudo pode ter sido removido ou ainda nao foi publicado.'}
          action={
            <Link to={paths.home} className="btn btn-primary">
              <Home className="h-4 w-4" /> Voltar para o inicio
            </Link>
          }
        />
      </div>
    );
  }

  const { post, related } = data;
  const accent = post.category_color || 'var(--c-primary)';

  return (
    <article>
      <div className="mx-auto max-w-content px-4 pt-8 sm:px-6">
        <Link
          to={paths.home}
          className="inline-flex items-center gap-2 text-sm font-semibold no-underline opacity-70 hover:opacity-100"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <header className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 text-xs opacity-75">
          {post.category_name && (
            <Link
              to={paths.category(post.category_slug)}
              className="chip no-underline"
              style={{ background: `${accent}22`, color: accent }}
            >
              {post.category_name}
            </Link>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(post.published_at || post.created_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {readingTime(post.content)} min de leitura
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {post.views} visualizacoes
          </span>
        </div>

        <h1 className="mt-4 font-heading text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/*
          O "lead" so aparece quando o resumo foi ESCRITO PELO AUTOR.
          Quando ele e gerado automaticamente, nada mais e do que o inicio do
          proprio conteudo — mostra-lo aqui faria o leitor ler o mesmo trecho
          duas vezes. Nas listagens ele continua sendo usado normalmente.
        */}
        {post.excerpt && post.excerpt_auto === false && (
          <p className="mt-4 text-lg leading-relaxed opacity-75">{post.excerpt}</p>
        )}

        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y py-4"
          style={{ borderColor: 'var(--c-border)' }}
        >
          {post.author && (
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: accent }}
              >
                {post.author.charAt(0).toUpperCase()}
              </span>
              {post.author}
            </span>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={copyLink} className="btn btn-ghost">
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {copied ? 'Link copiado' : 'Copiar link'}
            </button>
            <a
              className="btn btn-ghost"
              target="_blank"
              rel="noreferrer"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`}
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </a>
          </div>
        </div>
      </header>

      {post.cover_image && (
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full rounded-theme object-cover shadow-sm"
            style={{ maxHeight: 520 }}
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div
          className="prose-blog"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />
      </div>

      {related?.length > 0 && (
        <section
          className="mx-auto max-w-content border-t px-4 py-12 sm:px-6"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <h2 className="mb-6 inline-flex items-center gap-2 font-heading text-2xl font-black">
            <FileText className="h-5 w-5 opacity-50" /> Leia tambem
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
