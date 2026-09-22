import { Link } from "react-router-dom";
import { ArrowRight, Clock, Eye } from "lucide-react";
import { formatDate, readingTime } from "../../lib/markdown.js";
import { useBlog } from "../../context/BlogContext.jsx";
import { blogPaths } from "../../lib/urls.js";

export default function PostCard({ post, variant = "default" }) {
  const { blog } = useBlog();
  const paths = blogPaths(blog?.slug || "");
  const href = paths.post(post.slug);

  if (variant === "minimal") {
    return (
      <article
        className="group border-b py-6 last:border-b-0"
        style={{ borderColor: "var(--c-border)" }}
      >
        <div className="flex flex-wrap items-center gap-3 text-xs opacity-70">
          {post.category_name && (
            <Link
              to={paths.category(post.category_slug)}
              className="chip no-underline"
              style={{
                background: `${post.category_color || "var(--c-primary)"}22`,
                color: post.category_color || "var(--c-primary)",
              }}
            >
              {post.category_name}
            </Link>
          )}
          <span>{formatDate(post.published_at || post.created_at)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime(post.content || post.excerpt)} min
          </span>
        </div>
        <h3 className="mt-3 text-xl font-bold leading-snug">
          <Link to={href} className="no-underline hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed opacity-75">
          {post.excerpt || ""}
        </p>
        <Link
          to={href}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold no-underline"
          style={{ color: "var(--c-primary)" }}
        >
          Ler mais <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </article>
    );
  }

  const horizontal = variant === "horizontal";

  return (
    <article
      className={`card group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        horizontal ? "sm:flex" : ""
      }`}
    >
      <Link
        to={href}
        className={`block overflow-hidden ${horizontal ? "sm:w-2/5 sm:shrink-0" : ""}`}
      >
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              horizontal ? "h-48 sm:h-full" : "h-48"
            }`}
          />
        ) : (
          <div
            className={`flex w-full items-center justify-center ${horizontal ? "h-48 sm:h-full" : "h-48"}`}
            style={{
              background: `linear-gradient(135deg, ${post.category_color || "var(--c-primary)"}33, var(--c-surface))`,
            }}
          >
            <span className="font-heading text-3xl font-black opacity-30">
              {(post.title || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
          {post.category_name && (
            <Link
              to={paths.category(post.category_slug)}
              className="chip no-underline"
              style={{
                background: `${post.category_color || "var(--c-primary)"}22`,
                color: post.category_color || "var(--c-primary)",
              }}
            >
              {post.category_name}
            </Link>
          )}
          <span>{formatDate(post.published_at || post.created_at)}</span>
        </div>

        <h3 className="mt-3 text-lg font-bold leading-snug">
          <Link
            to={href}
            className="no-underline transition group-hover:opacity-80"
          >
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed opacity-75">
          {post.excerpt || ""}
        </p>

        <div className="mt-4 flex items-center justify-between text-xs opacity-60">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />{" "}
            {readingTime(post.content || post.excerpt)} min de leitura
          </span>
          {typeof post.views === "number" && post.views > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {post.views}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Destaque grande usado pelos templates "magazine" e "classic". */
export function FeaturedPost({ post }) {
  const { blog } = useBlog();
  const paths = blogPaths(blog?.slug || "");
  if (!post) return null;

  return (
    <article className="card group relative overflow-hidden">
      <Link to={paths.post(post.slug)} className="block">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="h-[320px] w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-[420px]"
          />
        ) : (
          <div
            className="h-[320px] w-full sm:h-[420px]"
            style={{
              background: `linear-gradient(135deg, ${post.category_color || "var(--c-primary)"}, var(--c-secondary))`,
            }}
          />
        )}

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
            {post.category_name && (
              <span
                className="chip"
                style={{
                  background: post.category_color || "var(--c-primary)",
                  color: "#fff",
                }}
              >
                {post.category_name}
              </span>
            )}
            <span>{formatDate(post.published_at || post.created_at)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />{" "}
              {readingTime(post.content || post.excerpt)} min
            </span>
          </div>

          <h2 className="mt-3 max-w-3xl font-heading text-2xl font-black leading-tight text-white sm:text-4xl">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-3 hidden max-w-2xl text-sm leading-relaxed text-white/85 sm:block">
              {post.excerpt}
            </p>
          )}

          <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-theme bg-white px-4 py-2.5 text-sm font-bold text-gray-900">
            Ler publicação <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}
