import './env.js';
import bcrypt from 'bcryptjs';
import { pool, one } from './db.js';
import { createBlog, DEFAULT_SETTINGS } from './blog-service.js';
import { buildExcerpt } from './utils.js';

/* ------------------------------------------------------------------
   Sistema de migracoes

   Cada migracao roda UMA vez (registrada em schema_migrations). Isso permite
   evoluir o banco com seguranca, inclusive em um banco que ja tem dados.
------------------------------------------------------------------- */

const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  blog_name         TEXT NOT NULL DEFAULT 'Meu Blog',
  tagline           TEXT NOT NULL DEFAULT 'Ideias, historias e novidades',
  description       TEXT NOT NULL DEFAULT '',
  logo_url          TEXT,
  favicon_url       TEXT,
  banner_url        TEXT,
  banner_title      TEXT NOT NULL DEFAULT '',
  banner_subtitle   TEXT NOT NULL DEFAULT '',
  banner_overlay    NUMERIC(4,2) NOT NULL DEFAULT 0.45,
  primary_color     TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color   TEXT NOT NULL DEFAULT '#0f172a',
  accent_color      TEXT NOT NULL DEFAULT '#f59e0b',
  text_color        TEXT NOT NULL DEFAULT '#1f2937',
  background_color  TEXT NOT NULL DEFAULT '#ffffff',
  surface_color     TEXT NOT NULL DEFAULT '#f8fafc',
  border_color      TEXT NOT NULL DEFAULT '#e5e7eb',
  heading_font      TEXT NOT NULL DEFAULT 'Inter',
  body_font         TEXT NOT NULL DEFAULT 'Inter',
  border_radius     INTEGER NOT NULL DEFAULT 12,
  template          TEXT NOT NULL DEFAULT 'classic',
  show_banner       BOOLEAN NOT NULL DEFAULT TRUE,
  show_sidebar      BOOLEAN NOT NULL DEFAULT FALSE,
  show_author       BOOLEAN NOT NULL DEFAULT TRUE,
  navbar            JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_text       TEXT NOT NULL DEFAULT '',
  social_links      JSONB NOT NULL DEFAULT '[]'::jsonb,
  posts_per_page    INTEGER NOT NULL DEFAULT 6,
  dark_mode         BOOLEAN NOT NULL DEFAULT FALSE,
  custom_css        TEXT NOT NULL DEFAULT '',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  excerpt       TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  cover_image   TEXT,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author        TEXT NOT NULL DEFAULT 'Admin',
  status        TEXT NOT NULL DEFAULT 'draft',
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  views         INTEGER NOT NULL DEFAULT 0,
  meta_title    TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts (status, published_at DESC);
`;

/** Converte a navbar antiga (caminhos absolutos) para caminhos relativos ao blog. */
function convertLegacyNavbar(navbar) {
  if (!Array.isArray(navbar)) return DEFAULT_SETTINGS.navbar;

  return navbar.map((item) => {
    const url = String(item?.url ?? '');
    let converted = url;
    if (url === '/' || url === '') converted = '';
    else if (url === '/categorias') converted = 'categorias';
    else if (url === '/sobre') converted = 'sobre';
    else if (url.startsWith('/')) converted = url.slice(1);
    return { label: String(item?.label ?? ''), url: converted };
  });
}

const MIGRATIONS = [
  {
    id: '001_base',
    description: 'Tabelas iniciais (blog unico)',
    async run(client) {
      await client.query(BASE_SCHEMA);
    },
  },
  {
    id: '002_multiblog',
    description: 'Suporte a multiplos blogs + pastas de imagem por blog',
    async run(client) {
      // 1) Tabela de blogs
      await client.query(`
        CREATE TABLE IF NOT EXISTS blogs (
          id             SERIAL PRIMARY KEY,
          slug           TEXT UNIQUE NOT NULL,
          storage_folder TEXT UNIQUE NOT NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 2) settings passa a aceitar varias linhas (uma por blog)
      await client.query(`CREATE SEQUENCE IF NOT EXISTS settings_id_seq`);
      await client.query(
        `ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq')`
      );
      await client.query(
        `SELECT setval('settings_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM settings), 0), 1))`
      );
      await client.query(`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_singleton`);
      await client.query(
        `ALTER TABLE settings ADD COLUMN IF NOT EXISTS blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE`
      );
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS settings_blog_id_key ON settings (blog_id)`
      );

      // 3) posts e categorias passam a pertencer a um blog
      await client.query(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE`
      );
      await client.query(
        `ALTER TABLE categories ADD COLUMN IF NOT EXISTS blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE`
      );

      // slug unico passa a ser por blog
      await client.query(`ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_slug_key`);
      await client.query(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key`);

      // 4) Converte a configuracao legada (blog unico) em um blog de verdade,
      //    preservando nome, cores, textos e personalizacoes ja feitas.
      const legacy = await client.query(
        `SELECT * FROM settings WHERE blog_id IS NULL ORDER BY id ASC LIMIT 1`
      );

      if (legacy.rows.length) {
        const old = legacy.rows[0];
        const navbar = JSON.stringify(convertLegacyNavbar(old.navbar));

        const blogRow = await client.query(
          `INSERT INTO blogs (slug, storage_folder)
           VALUES ('meu-blog', 'meu-blog')
           ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
        );
        const blogId = blogRow.rows[0].id;

        await client.query(
          `UPDATE settings SET blog_id = $1, navbar = $2::jsonb WHERE id = $3`,
          [blogId, navbar, old.id]
        );

        await client.query(`UPDATE posts SET blog_id = $1 WHERE blog_id IS NULL`, [blogId]);
        await client.query(`UPDATE categories SET blog_id = $1 WHERE blog_id IS NULL`, [blogId]);

        console.log(
          `[migrate] blog unico convertido em multi-blog (id ${blogId}, mantendo as configuracoes existentes).`
        );
      }

      // 5) Backfill defensivo: qualquer registro orfao vai para o blog mais antigo
      await client.query(
        `UPDATE posts SET blog_id = (SELECT id FROM blogs ORDER BY id ASC LIMIT 1) WHERE blog_id IS NULL`
      );
      await client.query(
        `UPDATE categories SET blog_id = (SELECT id FROM blogs ORDER BY id ASC LIMIT 1) WHERE blog_id IS NULL`
      );

      // 6) Indices por blog
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS posts_blog_slug_key ON posts (blog_id, slug)`
      );
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS categories_blog_slug_key ON categories (blog_id, slug)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_posts_blog_status ON posts (blog_id, status, published_at DESC)`
      );
      await client.query(`CREATE INDEX IF NOT EXISTS idx_categories_blog ON categories (blog_id)`);
    },
  },
  {
    id: '003_excerpt_auto',
    description: 'Distingue resumo automatico de resumo escrito pelo autor',
    async run(client) {
      await client.query(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt_auto BOOLEAN NOT NULL DEFAULT TRUE`
      );

      // Nos posts que ja existem, descobrimos a origem comparando o resumo
      // salvo com o que seria gerado automaticamente a partir do conteudo.
      const { rows } = await client.query('SELECT id, content, excerpt FROM posts');
      let autorais = 0;

      for (const row of rows) {
        const { text: generated } = buildExcerpt(row.content, '');
        const saved = String(row.excerpt || '').trim();
        const auto = !saved || saved === generated;

        if (!auto) autorais += 1;
        await client.query('UPDATE posts SET excerpt_auto = $1 WHERE id = $2', [auto, row.id]);
      }

      if (rows.length) {
        console.log(
          `[migrate] ${rows.length} publicacao(oes) analisada(s) — ` +
            `${rows.length - autorais} com resumo automatico, ${autorais} com resumo proprio.`
        );
      }
    },
  },
];

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          TEXT PRIMARY KEY,
      description TEXT NOT NULL DEFAULT '',
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function runMigrations() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const { rows } = await client.query('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.id));

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;

      console.log(`[migrate] aplicando ${migration.id} — ${migration.description}`);
      try {
        await client.query('BEGIN');
        await migration.run(client);
        await client.query(
          'INSERT INTO schema_migrations (id, description) VALUES ($1, $2)',
          [migration.id, migration.description]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migracao ${migration.id} falhou: ${err.message}`);
      }
    }

    console.log('[migrate] schema sincronizado com sucesso.');
  } finally {
    client.release();
  }

  await ensureAdminUser();
  await ensureDefaultBlog();
}

/** Cria/atualiza o unico usuario administrador a partir das variaveis de ambiente. */
export async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await one('SELECT id FROM users WHERE username = $1', [username]);

  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [
      username,
      hash,
    ]);
    console.log(`[migrate] usuario administrador "${username}" criado.`);
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('[migrate] ATENCAO: senha padrao "admin123" em uso. Defina ADMIN_PASSWORD!');
    }
    return;
  }

  if (process.env.ADMIN_PASSWORD_SYNC === 'true' && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, existing.id]);
    console.log('[migrate] senha do administrador sincronizada com ADMIN_PASSWORD.');
  }
}

/** Garante que exista ao menos um blog (necessario no primeiro boot). */
export async function ensureDefaultBlog() {
  const count = await one('SELECT COUNT(*)::int AS total FROM blogs');
  if (count?.total > 0) return;

  const { blog } = await createBlog({ name: 'Meu Blog', slug: 'meu-blog' });
  console.log(`[migrate] blog inicial criado: /b/${blog.slug}`);
}

// Execucao direta: `node src/migrate.js`
const isDirectRun = process.argv[1] && process.argv[1].endsWith('migrate.js');
if (isDirectRun) {
  runMigrations()
    .then(() => {
      console.log('[migrate] concluido.');
      return pool.end();
    })
    .catch((err) => {
      console.error('[migrate] falhou:', err);
      process.exit(1);
    });
}
