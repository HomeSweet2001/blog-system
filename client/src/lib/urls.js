/**
 * URLs do blog. Cada blog vive em /b/<slug>; o painel em /admin/b/<id>.
 * Assim e possivel ter varios blogs sem depender de subdominios
 * (o plano gratuito do Render nao permite subdominios).
 */

export function blogPaths(slug) {
  const base = `/b/${slug}`;
  return {
    base,
    home: base,
    search: (term) => (term ? `${base}/buscar?q=${encodeURIComponent(term)}` : `${base}/buscar`),
    categories: `${base}/categorias`,
    category: (categorySlug) => `${base}/categoria/${categorySlug}`,
    post: (postSlug) => `${base}/post/${postSlug}`,
    about: `${base}/sobre`,
  };
}

export function adminPaths(blogId) {
  const base = `/admin/b/${blogId}`;
  return {
    base,
    home: base,
    posts: `${base}/posts`,
    newPost: `${base}/posts/novo`,
    editPost: (id) => `${base}/posts/${id}`,
    categories: `${base}/categorias`,
    appearance: `${base}/aparencia`,
  };
}

/**
 * Resolve o link de um item da navbar.
 *
 * - `https://...`  -> link externo
 * - `/admin...`    -> caminho absoluto da aplicacao
 * - qualquer outro -> relativo ao blog  ("" = inicio, "sobre" = /b/<slug>/sobre)
 *
 * Guardar o valor relativo faz os links continuarem funcionando mesmo
 * se o endereco (slug) do blog mudar.
 */
export function resolveNavUrl(url, slug) {
  const value = String(url ?? '').trim();

  if (/^(https?:)?\/\//i.test(value) || /^(mailto|tel):/i.test(value)) {
    return { to: value, external: true };
  }

  if (value.startsWith('/')) {
    return { to: value, external: false };
  }

  const base = `/b/${slug}`;
  if (!value) return { to: base, external: false };

  return { to: `${base}/${value.replace(/^\/+/, '')}`, external: false };
}
