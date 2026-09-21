import { Router } from 'express';
import { many, one, query } from '../db.js';
import { createBlog, getBlogWithSettings, uniqueBlogSlug } from '../blog-service.js';
import {
  storageInfo,
  blogFolder,
  FOLDER_TYPES,
  deleteBlogStorage,
} from '../storage.js';
import { toInt } from '../utils.js';

/* ------------------------------------------------------------------ */
/* Rotas publicas  ->  /api/blogs                                      */
/* ------------------------------------------------------------------ */
export const publicRouter = Router();

/** GET /api/blogs -> lista de blogs publicados (pagina inicial) */
publicRouter.get('/', async (_req, res, next) => {
  try {
    const blogs = await many(
      `SELECT b.id, b.slug, b.storage_folder, b.created_at,
              COALESCE(s.blog_name, 'Blog') AS name,
              COALESCE(s.tagline, '') AS tagline,
              COALESCE(s.description, '') AS description,
              s.logo_url, s.favicon_url, s.banner_url, s.primary_color, s.secondary_color, s.accent_color,
              (SELECT COUNT(*)::int FROM posts p WHERE p.blog_id = b.id AND p.status = 'published') AS post_count
       FROM blogs b
       LEFT JOIN settings s ON s.blog_id = b.id
       ORDER BY b.id ASC`
    );
    return res.json({ blogs });
  } catch (err) {
    return next(err);
  }
});

/** GET /api/blogs/:blogSlug -> blog + configuracao de aparencia (publico) */
publicRouter.get('/:blogSlug', async (req, res, next) => {
  try {
    const result = await getBlogWithSettings({ slug: String(req.params.blogSlug || '') });
    if (!result) return res.status(404).json({ error: 'Blog nao encontrado.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/* Rotas administrativas -> /api/admin/blogs                           */
/* ------------------------------------------------------------------ */
export const adminRouter = Router();

/** GET /api/admin/blogs */
adminRouter.get('/', async (_req, res, next) => {
  try {
    const blogs = await many(
      `SELECT b.id, b.slug, b.storage_folder, b.created_at, b.updated_at,
              COALESCE(s.blog_name, 'Blog') AS name,
              COALESCE(s.tagline, '') AS tagline,
              s.primary_color, s.accent_color, s.template,
              (SELECT COUNT(*)::int FROM posts p WHERE p.blog_id = b.id) AS posts_total,
              (SELECT COUNT(*)::int FROM posts p WHERE p.blog_id = b.id AND p.status = 'published') AS posts_published,
              (SELECT COUNT(*)::int FROM categories c WHERE c.blog_id = b.id) AS categories_total,
              (SELECT COALESCE(SUM(p.views), 0)::int FROM posts p WHERE p.blog_id = b.id) AS views_total
       FROM blogs b
       LEFT JOIN settings s ON s.blog_id = b.id
       ORDER BY b.id ASC`
    );
    return res.json({ blogs });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/admin/blogs  { name, slug?, description? } */
adminRouter.post('/', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Informe o nome do blog.' });
    if (name.length > 80) return res.status(400).json({ error: 'Nome muito longo (max. 80).' });

    const requestedSlug = String(req.body?.slug || '').trim();

    const client = await (await import('../db.js')).pool.connect();
    try {
      await client.query('BEGIN');
      const { blog, settings } = await createBlog(
        { name, slug: requestedSlug || name, description: String(req.body?.description || '') },
        client
      );
      await client.query('COMMIT');
      return res.status(201).json({
        blog: { ...blog, name: settings.blog_name },
        settings,
      });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (err) {
    return next(err);
  }
});

/** GET /api/admin/blogs/:blogId -> blog + configuracao + pastas de imagem */
adminRouter.get('/:blogId', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(String(req.params.blogId))) {
      return res.status(400).json({ error: 'Identificador de blog invalido.' });
    }

    const result = await getBlogWithSettings({ id: Number.parseInt(req.params.blogId, 10) });
    if (!result) return res.status(404).json({ error: 'Blog nao encontrado.' });

    const { blog, settings } = result;

    return res.json({
      blog,
      settings,
      storage: {
        ...storageInfo(blog.storage_folder),
        folders: Object.fromEntries(
          FOLDER_TYPES.map((type) => [type, blogFolder(blog.storage_folder, type)])
        ),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/admin/blogs/:blogId  { name?, slug? } */
adminRouter.put('/:blogId', async (req, res, next) => {
  try {
    const id = toInt(req.params.blogId, 0);
    const blog = await one('SELECT * FROM blogs WHERE id = $1', [id]);
    if (!blog) return res.status(404).json({ error: 'Blog nao encontrado.' });

    const name = String(req.body?.name ?? '').trim();
    const requestedSlug = String(req.body?.slug ?? '').trim();

    let slug = blog.slug;
    if (requestedSlug && requestedSlug !== blog.slug) {
      slug = await uniqueBlogSlug(requestedSlug, id, one);
    }

    await query('UPDATE blogs SET slug = $1, updated_at = NOW() WHERE id = $2', [slug, id]);

    if (name) {
      await query(
        'UPDATE settings SET blog_name = $1, updated_at = NOW() WHERE blog_id = $2',
        [name.slice(0, 80), id]
      );
    }

    const result = await getBlogWithSettings({ id });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/** DELETE /api/admin/blogs/:blogId?deleteImages=true */
adminRouter.delete('/:blogId', async (req, res, next) => {
  try {
    const id = toInt(req.params.blogId, 0);

    const total = await one('SELECT COUNT(*)::int AS total FROM blogs');
    if ((total?.total ?? 0) <= 1) {
      return res
        .status(400)
        .json({ error: 'Nao e possivel excluir o unico blog existente. Crie outro antes.' });
    }

    const blog = await one('SELECT * FROM blogs WHERE id = $1', [id]);
    if (!blog) return res.status(404).json({ error: 'Blog nao encontrado.' });

    const deleteImages = String(req.query.deleteImages || '') === 'true';

    // posts, categorias e configuracao saem por ON DELETE CASCADE
    await query('DELETE FROM blogs WHERE id = $1', [id]);

    let images = { deleted: 0, errors: [] };
    if (deleteImages) {
      images = await deleteBlogStorage(blog.storage_folder);
    }

    return res.json({ ok: true, deletedImages: images.deleted, imageErrors: images.errors });
  } catch (err) {
    return next(err);
  }
});
