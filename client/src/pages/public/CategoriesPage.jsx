import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FolderOpen, Home } from "lucide-react";
import { apiBlogs } from "../../lib/api.js";
import { useBlog } from "../../context/BlogContext.jsx";
import { blogPaths } from "../../lib/urls.js";
import { setPageTitle } from "../../lib/theme.js";
import PostCard from "../../components/public/PostCard.jsx";
import Pagination from "../../components/public/Pagination.jsx";
import { EmptyState, FullPageLoader } from "../../components/ui/Feedback.jsx";

export function CategoriesPage() {
  const { blog } = useBlog();
  const slug = blog?.slug || "";
  const paths = blogPaths(slug);

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return undefined;
    setPageTitle("Categorias");
    apiBlogs
      .categories(slug)
      .then((data) => setCategories(data?.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
    return undefined;
  }, [slug]);

  if (loading) return <FullPageLoader />;

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
      <h1 className="font-heading text-3xl font-black">Categorias</h1>
      <p className="mt-2 opacity-70">Explore as publicações por assunto.</p>

      {categories.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={FolderOpen} title="Nenhuma categoria cadastrada" />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={paths.category(cat.slug)}
              className="card group flex flex-col gap-3 p-6 no-underline transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-theme text-lg font-black text-white"
                style={{ background: cat.color }}
              >
                {cat.name.charAt(0).toUpperCase()}
              </span>
              <h2 className="font-heading text-lg font-bold">{cat.name}</h2>
              {cat.description && (
                <p className="text-sm opacity-70">{cat.description}</p>
              )}
              <span className="mt-auto text-xs font-semibold opacity-60">
                {cat.post_count}{" "}
                {cat.post_count === 1 ? "publicação" : "publicações"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryPostsPage() {
  const { slug } = useParams();
  const { blog } = useBlog();
  const blogSlug = blog?.slug || "";
  const paths = blogPaths(blogSlug);

  const [data, setData] = useState({ posts: [], pagination: null });
  const [category, setCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!blogSlug) return undefined;
    setPage(1);
    apiBlogs
      .categories(blogSlug)
      .then((res) => {
        const found = (res?.categories || []).find((c) => c.slug === slug);
        setCategory(found || null);
        setPageTitle(found ? found.name : "Categoria");
      })
      .catch(() => {});
    return undefined;
  }, [blogSlug, slug]);

  useEffect(() => {
    if (!blogSlug) return undefined;

    let cancelled = false;
    setLoading(true);
    apiBlogs
      .posts(blogSlug, { category: slug, page, limit: 9 })
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setData({ posts: [], pagination: null }))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [blogSlug, slug, page]);

  return (
    <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
      <span
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: category?.color || "var(--c-primary)" }}
      >
        Categoria
      </span>
      <h1 className="mt-1 font-heading text-3xl font-black">
        {category?.name || slug}
      </h1>
      {category?.description && (
        <p className="mt-2 max-w-2xl opacity-70">{category.description}</p>
      )}

      <div className="mt-10">
        {loading ? (
          <FullPageLoader />
        ) : data.posts.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Nenhuma publicação nesta categoria"
            action={
              <Link to={paths.home} className="btn btn-primary">
                Ver todas
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination pagination={data.pagination} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
