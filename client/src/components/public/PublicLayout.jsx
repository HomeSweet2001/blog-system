import { useEffect } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { BlogProvider, useBlog } from '../../context/BlogContext.jsx';
import { EmptyState, FullPageLoader } from '../ui/Feedback.jsx';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

/** Casca visual do blog (navbar + conteudo + rodape). */
function BlogShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function NotFoundShell({ message }) {
  return (
    <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
      <EmptyState
        icon={Compass}
        title="Blog nao encontrado"
        description={message || 'O endereco acessado nao corresponde a nenhum blog.'}
        action={
          <Link to="/" className="btn btn-primary">
            Ver todos os blogs
          </Link>
        }
      />
    </div>
  );
}

/** Mostra carregando/erro antes de renderizar o blog. */
function BlogGate() {
  const { blog, loading, error } = useBlog();

  if (loading && !blog) return <FullPageLoader label="Carregando o blog..." />;
  if (error || !blog) return <NotFoundShell message={error} />;
  return <BlogShell />;
}

export default function PublicLayout() {
  const { blogSlug } = useParams();

  return (
    <BlogProvider mode="slug" identifier={blogSlug}>
      <ScrollToTop />
      <BlogGate />
    </BlogProvider>
  );
}
