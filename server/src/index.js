import './env.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { runMigrations } from './migrate.js';
import { requireAuth } from './auth.js';
import { many } from './db.js';
import { loadBlogBySlug, loadBlogById } from './blog-service.js';
import { storageDriver, localUploadsDir, storageInfo } from './storage.js';

import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/upload.js';
import { publicRouter as blogsPublic, adminRouter as blogsAdmin } from './routes/blogs.js';
import {
  publicRouter as postsPublic,
  adminRouter as postsAdmin,
  statsRouter,
} from './routes/posts.js';
import {
  publicRouter as categoriesPublic,
  adminRouter as categoriesAdmin,
} from './routes/categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 4000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ------------------------------- middlewares -------------------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : true,
    credentials: false,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

// --------------------------------- rotas API --------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'blog-platform', time: new Date().toISOString() });
});

app.use('/api/auth', loginLimiter, authRoutes);

// ------------------------------ blogs publicos -------------------------------
// Lista de blogs (/) e detalhe de um blog (/:blogSlug)
app.use('/api/blogs', blogsPublic);

// Sub-recursos de um blog — loadBlogBySlug coloca o blog em req.blog
app.use('/api/blogs/:blogSlug/posts', loadBlogBySlug, postsPublic);
app.use('/api/blogs/:blogSlug/categories', loadBlogBySlug, categoriesPublic);

// ---------------------------- blogs administrativos --------------------------
app.use('/api/admin/blogs', requireAuth, blogsAdmin);

app.use('/api/admin/blogs/:blogId/settings', requireAuth, loadBlogById, settingsRoutes);
app.use('/api/admin/blogs/:blogId/posts', requireAuth, loadBlogById, postsAdmin);
app.use('/api/admin/blogs/:blogId/categories', requireAuth, loadBlogById, categoriesAdmin);
app.use('/api/admin/blogs/:blogId/upload', requireAuth, loadBlogById, uploadRoutes);
app.use('/api/admin/blogs/:blogId/stats', requireAuth, loadBlogById, statsRouter);

// --------------------------------- SEO util ---------------------------------
app.get('/robots.txt', (req, res) => {
  const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const base = (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

    const blogs = await many('SELECT id, slug FROM blogs ORDER BY id ASC');
    const posts = await many(
      `SELECT b.slug AS blog_slug, p.slug AS post_slug, p.updated_at
       FROM posts p
       JOIN blogs b ON b.id = p.blog_id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC
       LIMIT 5000`
    );

    const urls = [
      { loc: `${base}/`, lastmod: new Date().toISOString(), priority: '1.0' },
      ...blogs.map((b) => ({
        loc: `${base}/b/${b.slug}`,
        lastmod: new Date().toISOString(),
        priority: '0.9',
      })),
      ...posts.map((p) => ({
        loc: `${base}/b/${p.blog_slug}/post/${p.post_slug}`,
        lastmod: new Date(p.updated_at).toISOString(),
        priority: '0.8',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
});

// --------------- imagens salvas localmente (sem Cloudinary) -------------------
// Os arquivos ficam em server/uploads/<blog>/<tipo>/ e sao servidos aqui.
app.use(
  '/uploads',
  (_req, res, next) => {
    // Defesa extra: um arquivo enviado por usuario nunca deve executar scripts.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  },
  express.static(localUploadsDir(), { maxAge: '7d', index: false, dotfiles: 'deny' })
);

// ------------------------- front-end (build do React) ------------------------
if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1h', index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // Imagem inexistente deve dar 404, nao a pagina do React.
    if (req.path.startsWith('/uploads')) return res.status(404).end();
    return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res
      .status(503)
      .send('Front-end ainda nao compilado. Rode "npm run build" na raiz do projeto.');
  });
}

// ------------------------------ error handler -------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api] erro:', err);
  if (err?.message?.includes('Cloudinary')) {
    return res.status(502).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor.' : err.message,
  });
});

// ---------------------------------- boot ------------------------------------
async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    console.error('[boot] DATABASE_URL nao definida. Configure a conexao PostgreSQL.');
    process.exit(1);
  }

  try {
    await runMigrations();
  } catch (err) {
    console.error('[boot] falha ao executar migracoes:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[boot] servidor ouvindo em http://localhost:${PORT}`);
    console.log(`[boot] front-end: ${existsSync(CLIENT_DIST) ? CLIENT_DIST : 'nao compilado'}`);

    const storage = storageInfo();
    console.log(`[boot] imagens: ${storage.label} -> ${storage.baseFolder}`);

    if (storage.driver === 'local' && process.env.NODE_ENV === 'production') {
      console.warn(
        '[boot] ATENCAO: guardando imagens no disco local em producao.\n' +
          '       No Render o disco nao persiste entre deploys — configure as chaves\n' +
          '       CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET antes de publicar de verdade.'
      );
    }
  });

  const shutdown = (signal) => {
    console.log(`\n[boot] ${signal} recebido. Encerrando...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();

export default app;
