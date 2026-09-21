import { LayoutGrid, Rows3, Sparkles, Type } from 'lucide-react';
import PostCard, { FeaturedPost } from '../components/public/PostCard.jsx';

/* ------------------------------------------------------------------
   Os 4 templates de layout. Cada um recebe a mesma lista de posts e
   define apenas COMO ela e apresentada. A escolha e feita no painel
   administrativo (Aparencia > Layout) e salva em settings.template.
------------------------------------------------------------------- */

function Grid({ posts, columns = 3, gap = 'gap-6' }) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return <div className={`grid grid-cols-1 ${cols} ${gap}`}>{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-primary)' }}>
            {eyebrow}
          </span>
        )}
        <h2 className="mt-1 font-heading text-2xl font-black">{title}</h2>
      </div>
    </div>
  );
}

/* ----------------------------- 1. Classico ----------------------------- */
function ClassicTemplate({ posts }) {
  if (!posts.length) return null;
  const [first, ...rest] = posts;

  return (
    <div className="space-y-10">
      <FeaturedPost post={first} />

      {rest.length > 0 && (
        <div className="space-y-6">
          {rest.map((post) => (
            <PostCard key={post.id} post={post} variant="horizontal" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- 2. Revista ------------------------------ */
function MagazineTemplate({ posts }) {
  if (!posts.length) return null;
  const [first, ...rest] = posts;

  return (
    <div className="space-y-12">
      <FeaturedPost post={first} />

      {rest.length > 0 && (
        <section>
          <SectionTitle eyebrow="Ultimas publicacoes" title="Continue lendo" />
          <Grid posts={rest.slice(0, 6)} columns={3} />
        </section>
      )}
    </div>
  );
}

/* ------------------------------ 3. Grade ------------------------------- */
function GridTemplate({ posts }) {
  if (!posts.length) return null;
  return (
    <section>
      <SectionTitle eyebrow="Publicacoes" title="Todas as publicacoes" />
      <Grid posts={posts} columns={3} />
    </section>
  );
}

/* --------------------------- 4. Minimalista ---------------------------- */
function MinimalTemplate({ posts }) {
  if (!posts.length) return null;
  return (
    <section className="mx-auto max-w-3xl">
      <SectionTitle eyebrow="Arquivo" title="Publicacoes recentes" />
      <div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} variant="minimal" />
        ))}
      </div>
    </section>
  );
}

export const TEMPLATE_COMPONENTS = {
  classic: ClassicTemplate,
  magazine: MagazineTemplate,
  grid: GridTemplate,
  minimal: MinimalTemplate,
};

/** Icones de apoio para o seletor de templates no painel. */
export const TEMPLATE_ICONS = {
  classic: Rows3,
  magazine: Sparkles,
  grid: LayoutGrid,
  minimal: Type,
};

export default function TemplateRenderer({ template, posts }) {
  const Component = TEMPLATE_COMPONENTS[template] || ClassicTemplate;
  return <Component posts={posts} />;
}
