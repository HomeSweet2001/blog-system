import { Router } from 'express';
import { one, query } from '../db.js';
import { toInt, clamp, pickHexColor } from '../utils.js';
import { getBlogWithSettings } from '../blog-service.js';

const router = Router();

/** Campos que o administrador pode alterar. */
const TEXT_FIELDS = [
  'blog_name',
  'tagline',
  'description',
  'logo_url',
  'favicon_url',
  'banner_url',
  'banner_title',
  'banner_subtitle',
  'heading_font',
  'body_font',
  'template',
  'footer_text',
  'custom_css',
];

const COLOR_FIELDS = [
  'primary_color',
  'secondary_color',
  'accent_color',
  'text_color',
  'background_color',
  'surface_color',
  'border_color',
];

const BOOL_FIELDS = ['show_banner', 'show_sidebar', 'show_author', 'dark_mode'];

function sanitizeNavbar(value) {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      label: String(item.label ?? '').slice(0, 60),
      // URL relativa ao blog (ex.: "sobre"), absoluta ("/admin") ou externa (https://).
      url: String(item.url ?? '').slice(0, 300),
      openInNewTab: Boolean(item.openInNewTab),
    }))
    .filter((item) => item.label.length > 0)
    .slice(0, 12);
}

function sanitizeSocial(value) {
  if (!Array.isArray(value)) return null;
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      network: String(item.network ?? '').slice(0, 40),
      url: String(item.url ?? '').slice(0, 300),
    }))
    .filter((item) => item.url.length > 0)
    .slice(0, 10);
}

/** GET /api/admin/blogs/:blogId/settings */
router.get('/', async (req, res, next) => {
  try {
    const result = await getBlogWithSettings({ id: req.blog.id });
    if (!result) return res.status(404).json({ error: 'Blog nao encontrado.' });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/** PUT /api/admin/blogs/:blogId/settings */
router.put('/', async (req, res, next) => {
  try {
    const blogId = req.blog.id;
    const body = req.body || {};
    const sets = [];
    const values = [];
    let idx = 1;

    for (const field of TEXT_FIELDS) {
      if (field in body) {
        sets.push(`${field} = $${idx++}`);
        values.push(body[field] === null ? null : String(body[field]));
      }
    }

    for (const field of COLOR_FIELDS) {
      if (field in body) {
        sets.push(`${field} = $${idx++}`);
        values.push(pickHexColor(body[field], '#000000'));
      }
    }

    for (const field of BOOL_FIELDS) {
      if (field in body) {
        sets.push(`${field} = $${idx++}`);
        values.push(Boolean(body[field]));
      }
    }

    if ('border_radius' in body) {
      sets.push(`border_radius = $${idx++}`);
      values.push(clamp(toInt(body.border_radius, 12), 0, 40));
    }

    if ('posts_per_page' in body) {
      sets.push(`posts_per_page = $${idx++}`);
      values.push(clamp(toInt(body.posts_per_page, 6), 1, 48));
    }

    if ('banner_overlay' in body) {
      sets.push(`banner_overlay = $${idx++}`);
      values.push(clamp(Number(body.banner_overlay) || 0, 0, 1));
    }

    if ('navbar' in body) {
      const nav = sanitizeNavbar(body.navbar);
      if (nav) {
        sets.push(`navbar = $${idx++}::jsonb`);
        values.push(JSON.stringify(nav));
      }
    }

    if ('social_links' in body) {
      const social = sanitizeSocial(body.social_links);
      if (social) {
        sets.push(`social_links = $${idx++}::jsonb`);
        values.push(JSON.stringify(social));
      }
    }

    if (!sets.length) {
      return res.status(400).json({ error: 'Nenhum campo valido para atualizar.' });
    }

    sets.push('updated_at = NOW()');
    values.push(blogId);

    const { rows } = await query(
      `UPDATE settings SET ${sets.join(', ')} WHERE blog_id = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Configuracao do blog nao encontrada.' });
    }

    return res.json({ settings: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/** POST /api/admin/blogs/:blogId/settings/reset -> restaura a aparencia padrao */
router.post('/reset', async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE settings SET
         tagline='Ideias, historias e novidades',
         logo_url=NULL, favicon_url=NULL, banner_url=NULL,
         banner_title='', banner_subtitle='', banner_overlay=0.45,
         primary_color='#6366f1', secondary_color='#0f172a', accent_color='#f59e0b',
         text_color='#1f2937', background_color='#ffffff', surface_color='#f8fafc',
         border_color='#e5e7eb', heading_font='Inter', body_font='Inter',
         border_radius=12, template='classic', show_banner=TRUE, show_sidebar=FALSE,
         show_author=TRUE, dark_mode=FALSE, custom_css='', posts_per_page=6,
         navbar='[{"label":"Inicio","url":""},{"label":"Categorias","url":"categorias"},{"label":"Sobre","url":"sobre"}]'::jsonb,
         social_links='[]'::jsonb, footer_text='Todos os direitos reservados.',
         updated_at=NOW()
       WHERE blog_id = $1 RETURNING *`,
      [req.blog.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Configuracao do blog nao encontrada.' });
    }

    return res.json({ settings: rows[0] });
  } catch (err) {
    return next(err);
  }
});

export default router;
