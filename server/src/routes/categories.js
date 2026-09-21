import { Router } from 'express';
import { many, one, query } from '../db.js';
import { uniqueScopedSlug, toInt, pickHexColor } from '../utils.js';

/* ------------------------- publico (req.blog pronto) ------------------------ */
export const publicRouter = Router();

/** GET /api/blogs/:blogSlug/categories */
publicRouter.get('/', async (req, res, next) => {
  try {
    const rows = await many(
      `SELECT c.id, c.name, c.slug, c.description, c.color,
              COUNT(p.id) FILTER (WHERE p.status = 'published')::int AS post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id
       WHERE c.blog_id = $1
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [req.blog.id]
    );
    return res.json({ categories: rows });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------- administrativo (req.blog) ------------------------ */
export const adminRouter = Router();

/** GET /api/admin/blogs/:blogId/categories */
adminRouter.get('/', async (req, res, next) => {
  try {
    const rows = await many(
      `SELECT c.id, c.name, c.slug, c.description, c.color, c.created_at,
              COUNT(p.id)::int AS post_count
       FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id
       WHERE c.blog_id = $1
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [req.blog.id]
    );
    return res.json({ categories: rows });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/admin/blogs/:blogId/categories */
adminRouter.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'O nome da categoria e obrigatorio.' });

    const slug = await uniqueScopedSlug(
      'categories',
      req.body?.slug || name,
      req.blog.id,
      null,
      one
    );

    const { rows } = await query(
      `INSERT INTO categories (blog_id, name, slug, description, color)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        req.blog.id,
        name.slice(0, 80),
        slug,
        String(req.body?.description || '').slice(0, 300),
        pickHexColor(req.body?.color, '#6366f1'),
      ]
    );

    return res.status(201).json({ category: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/admin/blogs/:blogId/categories/:id */
adminRouter.put('/:id', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const current = await one('SELECT * FROM categories WHERE id = $1 AND blog_id = $2', [
      id,
      req.blog.id,
    ]);
    if (!current) return res.status(404).json({ error: 'Categoria nao encontrada.' });

    const name = String(req.body?.name ?? current.name).trim();
    if (!name) return res.status(400).json({ error: 'O nome da categoria e obrigatorio.' });

    const slug =
      req.body?.slug && String(req.body.slug) !== current.slug
        ? await uniqueScopedSlug('categories', req.body.slug, req.blog.id, id, one)
        : current.slug;

    const { rows } = await query(
      `UPDATE categories SET name=$1, slug=$2, description=$3, color=$4
       WHERE id=$5 AND blog_id=$6 RETURNING *`,
      [
        name.slice(0, 80),
        slug,
        String(req.body?.description ?? current.description).slice(0, 300),
        pickHexColor(req.body?.color ?? current.color, current.color),
        id,
        req.blog.id,
      ]
    );

    return res.json({ category: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/admin/blogs/:blogId/categories/:id */
adminRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = toInt(req.params.id, 0);
    const { rowCount } = await query('DELETE FROM categories WHERE id = $1 AND blog_id = $2', [
      id,
      req.blog.id,
    ]);
    if (!rowCount) return res.status(404).json({ error: 'Categoria nao encontrada.' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
