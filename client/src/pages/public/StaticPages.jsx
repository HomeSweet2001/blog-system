import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { useBlog } from '../../context/BlogContext.jsx';
import { blogPaths } from '../../lib/urls.js';
import { setPageTitle } from '../../lib/theme.js';
import { EmptyState } from '../../components/ui/Feedback.jsx';

export function AboutPage() {
  const { settings } = useSettings();
  const { blog } = useBlog();
  const paths = blogPaths(blog?.slug || '');

  useEffect(() => {
    setPageTitle('Sobre');
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--c-primary)' }}
      >
        Sobre
      </span>
      <h1 className="mt-2 font-heading text-3xl font-black sm:text-4xl">{settings.blog_name}</h1>
      {settings.tagline && <p className="mt-3 text-lg opacity-80">{settings.tagline}</p>}

      <div className="prose-blog mt-8">
        <p>
          {settings.description ||
            'Este blog foi criado com a plataforma de blog personalizavel. Todo o conteudo e gerenciado pelo painel administrativo.'}
        </p>
        <p>
          Para editar este texto, acesse o painel administrativo e ajuste as configuracoes de
          aparencia e identidade do blog.
        </p>
      </div>

      <Link to={paths.home} className="btn btn-primary mt-8">
        <Home className="h-4 w-4" /> Ir para o inicio
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  const { blog } = useBlog();
  // Fora de um blog (ex.: URL solta), o botao leva para a lista de blogs.
  const home = blog?.slug ? blogPaths(blog.slug).home : '/';

  useEffect(() => {
    setPageTitle('Pagina nao encontrada');
  }, []);

  return (
    <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
      <EmptyState
        icon={Compass}
        title="404 — Pagina nao encontrada"
        description="O endereco acessado nao existe ou foi movido."
        action={
          <Link to={home} className="btn btn-primary">
            <Home className="h-4 w-4" /> {blog?.slug ? 'Voltar para o inicio' : 'Ver todos os blogs'}
          </Link>
        }
      />
    </div>
  );
}
