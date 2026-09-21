import { Router } from 'express';
import { many, one, query } from '../db.js';
import { toInt, clamp, uniqueScopedSlug, safeUrl, buildExcerpt as makeExcerpt } from '../utils.js';

const LIST_COLUMNS = `
  p.id, p.title, p.slug, p.excerpt, p.excerpt_auto, p.content, p.cover_image, p.author, p.status,
  p.featured, p.views, p.meta_title, p.meta_description,
  p.published_at, p.created_at, p.updated_at,
  c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.color AS category_color
`;

const LIST_FROM = `FROM posts p LEFT JOIN categories c ON c.id = p.category_id`;

function normalizeStatus(value) {
  return value === 'published' ? 'published' : 'draft';
}

/**
 * Normaliza o corpo da requisicao.
 * Com `existing` (PUT), os campos AUSENTES mantem o valor atual — evitando que
 * uma atualizacao parcial apague dados (categoria, capa, etc.).
 */
function readPostPayload(body, blogId, existing = null) {
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const pick = (key, current) => (has(key) ? body[key] : current);

  const title = String(pick('title', existing?.title ?? '') || '').trim();
  const content = String(pick('content', existing?.content ?? '') || '');
  const status = normalizeStatus(pick('status', existing?.status ?? 'draft'));

  const rawCategory = pick('category_id', existing?.category_id ?? null);
  const categoryId =
    rawCategory === null || rawCategory === undefined || rawCategory === ''
      ? null
      : toInt(rawCategory, null);

  const rawSlug = pick('slug', null);

  // Resumo: se o campo nao vier no corpo, mantemos o que ja existe (e a origem dele).
  const { text: excerpt, auto: excerptAuto } = has('excerpt')
    ? makeExcerpt(content, body.excerpt)
    : existing
      ? { text: existing.excerpt ?? '', auto: existing.excerpt_auto !== false }
      : makeExcerpt(content, '');

  return {
    blogId,
    title,
    content,
    status,
    categoryId,
    excerpt,
    excerptAuto,
    slug: rawSlug ? String(rawSlug) : title,
    coverImage: safeUrl(pick('cover_image', existing?.cover_image ?? null)),
    author: String(pick('author', existing?.author ?? 'Admin') || 'Admin').slice(0, 80),
    featured: Boolean(pick('featured', existing?.featured ?? false)),
    metaTitle: String(pick('meta_title', existing?.meta_title ?? '') || '').slice(0, 200),
    metaDescription: String(
      pick('meta_description', existing?.meta_description ?? '') || ''
    ).slice(0, 300),
  };
}

/* ------------------------------------------------------------------ */
/* Publico -> /api/blogs/:blogSlug/posts   (req.blog pronto)           */
/* ------------------------------------------------------------------ */
export const publicRouter = Router();

publicRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = clamp(toInt(req.query.limit, 9), 1, 48);
    const offset = (page - 1) * limit;
    const { category, search, featured } = req.query;

    const where = [`p.blog_id = $1`, `p.status = 'published'`];
    const params = [req.blog.id];

    if (category) {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }

    if (search) {
      params.push(`%${String(search).trim()}%`);
      where.push(
        `(p.title ILIKE $${params.length} OR p.excerpt ILIKE $${params.length} OR p.content ILIKE $${params.length})`
      );
    }

    if (featured === 'true') where.push('p.featured = TRUE');

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const countRow = await one(`SELECT COUNT(*)::int AS total ${LIST_FROM} ${whereSql}`, params);

    const rows = await many(
      `SELECT ${LIST_COLUMNS} ${LIST_FROM} ${whereSql}
       ORDER BY p.featured DESC, p.published_at DESC NULLS LAST, p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = countRow?.total ?? 0;

    return res.json({
      posts: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

publicRouter.get('/:slug', async (req, res, next) => {
  try {
    const post = await one(
      `SELECT ${LIST_COLUMNS} ${LIST_FROM}
       WHERE p.blog_id = $1 AND p.slug = $2 AND p.status = 'published'`,
      [req.blog.id, req.params.slug]
    );

    if (!post) return res.status(404).json({ error: 'Publicacao nao encontrada.' });

    const incremented = { ...post, views: (post.views || 0) + 1 };
    query('UPDATE posts SET views = views + 1 WHERE id = $1', [post.id]).catch(() => {});

    const related = await many(
      `SELECT ${LIST_COLUMNS} ${LIST_FROM}
       WHERE p.blog_id = $1 AND p.status = 'published' AND p.id <> $2
         AND ($3::int IS NULL OR p.category_id = $3)
       ORDER BY p.published_at DESC NULLS LAST
       LIMIT 3`,
      [req.blog.id, post.id, post.category_id]
    );

    return res.json({ post: incremented, related });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/* Administrativo -> /api/admin/blogs/:blogId/posts  (req.blog pronto) */
/* ------------------------------------------------------------------ */
export const adminRouter = Router();

adminRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const limit = clamp(toInt(req.query.limit, 20), 1, 100);
    const offset = (page - 1) * limit;
    const { status, category, search } = req.query;

    const where = ['p.blog_id = $1'];
    const params = [req.blog.id];

    if (status && status !== 'all') {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }
    if (category) {
      params.push(category);
      where.push(`c.slug = $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search).trim()}%`);
      where.push(`p.title ILIKE $${params.length}`);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const countRow = await one(`SELECT COUNT(*)::int AS total ${LIST_FROM} ${whereSql}`, params);

    const rows = await many(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.cover_image, p.status, p.featured,
              p.views, p.published_at, p.created_at, p.updated_at,
              c.name AS category_name, c.slug AS category_slug, c.color AS category_color
       ${LIST_FROM} ${whereSql}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = countRow?.total ?? 0;
    return res.json({
      posts: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    return next(err);
  }
});

adminRouter.get('/:id', async (req, res, next) => {
  try {
    const post = await one('SELECT * FROM posts WHERE id = $1 AND blog_id = $2', [
      toInt(req.params.id, 0),
      req.blog.id,
    ]);
    if (!post) return res.status(404).json({ error: 'Publicacao nao encontrada.' });
    return res.json({ post });
  } catch (err) {
    return next(err);
  }
});

adminRouter.post('/', async (req, res, next) => {
  try {
    const data = readPostPayload(req.body || {}, req.blog.id);
    if (!data.title) return res.status(400).json({ error: 'O titulo e obrigatorio.' });

    const slug = await uniqueScopedSlug('posts', data.slug, req.blog.id, null, one);

    const { rows } = await query(
      `INSERT INTO posts
        (blog_id, title, slug, excerpt, excerpt_auto, content, cover_image, category_id, author,
         status, featured, meta_title, meta_description, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
         CASE WHEN $10 = 'published' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [
        req.blog.id,
        data.title,
        slug,
        data.excerpt,
        data.excerptAuto,
        data.content,
        data.coverImage,
        data.categoryId,
        data.author,
        data.status,
        data.featured,
        data.metaTitle,
        data.metaDescription,
      ]
    );

    return res.status(201).json({ post: rows[0] });
  } catch (err) {
    return next(err);
  }
});

adminRouter.put('/:id', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const current = await one('SELECT * FROM posts WHERE id = $1 AND blog_id = $2', [
      id,
      req.blog.id,
    ]);
    if (!current) return res.status(404).json({ error: 'Publicacao nao encontrada.' });

    const data = readPostPayload(req.body || {}, req.blog.id, current);
    if (!data.title) return res.status(400).json({ error: 'O titulo e obrigatorio.' });

    // O slug e estavel: so muda se o usuario informar explicitamente outro valor.
    const requestedSlug = String(req.body?.slug || '').trim();
    const slug =
      !requestedSlug || requestedSlug === current.slug
        ? current.slug
        : await uniqueScopedSlug('posts', requestedSlug, req.blog.id, id, one);

    const { rows } = await query(
      `UPDATE posts SET
         title = $1, slug = $2, excerpt = $3, excerpt_auto = $4, content = $5, cover_image = $6,
         category_id = $7, author = $8, status = $9, featured = $10,
         meta_title = $11, meta_description = $12,
         published_at = CASE
           WHEN $9 = 'published' AND published_at IS NULL THEN NOW()
           WHEN $9 = 'draft' THEN NULL
           ELSE published_at
         END,
         updated_at = NOW()
       WHERE id = $13 AND blog_id = $14
       RETURNING *`,
      [
        data.title,
        slug,
        data.excerpt,
        data.excerptAuto,
        data.content,
        data.coverImage,
        data.categoryId,
        data.author,
        data.status,
        data.featured,
        data.metaTitle,
        data.metaDescription,
        id,
        req.blog.id,
      ]
    );

    return res.json({ post: rows[0] });
  } catch (err) {
    return next(err);
  }
});

adminRouter.patch('/:id/status', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const status = normalizeStatus(req.body?.status);
    const { rows } = await query(
      `UPDATE posts SET status = $1,
         published_at = CASE WHEN $1 = 'published' AND published_at IS NULL THEN NOW()
                             WHEN $1 = 'draft' THEN NULL ELSE published_at END,
         updated_at = NOW()
       WHERE id = $2 AND blog_id = $3 RETURNING *`,
      [status, id, req.blog.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Publicacao nao encontrada.' });
    return res.json({ post: rows[0] });
  } catch (err) {
    return next(err);
  }
});

adminRouter.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM posts WHERE id = $1 AND blog_id = $2', [
      toInt(req.params.id, 0),
      req.blog.id,
    ]);
    if (!rowCount) return res.status(404).json({ error: 'Publicacao nao encontrada.' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/* Estatisticas -> /api/admin/blogs/:blogId/stats                      */
/* ------------------------------------------------------------------ */
export const statsRouter = Router();

statsRouter.get('/', async (req, res, next) => {
  try {
    const blogId = req.blog.id;

    const totals = await one(
      `SELECT
        (SELECT COUNT(*)::int FROM posts WHERE blog_id = $1) AS posts_total,
        (SELECT COUNT(*)::int FROM posts WHERE blog_id = $1 AND status = 'published') AS posts_published,
        (SELECT COUNT(*)::int FROM posts WHERE blog_id = $1 AND status = 'draft') AS posts_draft,
        (SELECT COUNT(*)::int FROM categories WHERE blog_id = $1) AS categories_total,
        (SELECT COALESCE(SUM(views), 0)::int FROM posts WHERE blog_id = $1) AS views_total`,
      [blogId]
    );

    const recent = await many(
      `SELECT p.id, p.title, p.slug, p.status, p.views, p.created_at,
              c.name AS category_name, c.color AS category_color
       ${LIST_FROM}
       WHERE p.blog_id = $1
       ORDER BY p.created_at DESC LIMIT 5`,
      [blogId]
    );

    const byCategory = await many(
      `SELECT c.name, c.color, COUNT(p.id)::int AS total
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
       WHERE c.blog_id = $1
       GROUP BY c.id, c.name, c.color
       ORDER BY total DESC, c.name ASC`,
      [blogId]
    );

    return res.json({ totals, recent, byCategory });
  } catch (err) {
    return next(err);
  }
});
