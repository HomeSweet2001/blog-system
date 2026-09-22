/**
 * Regras compartilhadas de blog: criacao, pasta de armazenamento e valores padrao.
 * Usado tanto pela migracao/seed quanto pelas rotas.
 */
import { one, query } from "./db.js";
import { makeSlug } from "./utils.js";

// O caminho das pastas de imagem (nuvem ou local) fica em storage.js.

/** Garante um slug unico na tabela blogs. */
export async function uniqueBlogSlug(desired, ignoreId = null, runner = one) {
  const base = makeSlug(desired, "blog");
  let candidate = base;
  let i = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = ignoreId
      ? await runner("SELECT id FROM blogs WHERE slug = $1 AND id <> $2", [
          candidate,
          ignoreId,
        ])
      : await runner("SELECT id FROM blogs WHERE slug = $1", [candidate]);
    if (!row) return candidate;
    candidate = `${base}-${++i}`;
  }
}

/** Garante uma pasta de armazenamento unica (nao muda depois de criada). */
export async function uniqueStorageFolder(desired, runner = one) {
  const base = makeSlug(desired, "blog");
  let candidate = base;
  let i = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await runner("SELECT id FROM blogs WHERE storage_folder = $1", [
      candidate,
    ]);
    if (!row) return candidate;
    candidate = `${base}-${++i}`;
  }
}

export const DEFAULT_SETTINGS = {
  blog_name: "Meu Blog",
  tagline: "Ideias, histórias e novidades",
  description: "",
  primary_color: "#6366f1",
  secondary_color: "#0f172a",
  accent_color: "#f59e0b",
  text_color: "#1f2937",
  background_color: "#ffffff",
  surface_color: "#f8fafc",
  border_color: "#e5e7eb",
  heading_font: "Inter",
  body_font: "Inter",
  border_radius: 12,
  template: "classic",
  footer_text: "Todos os direitos reservados.",
  // URLs relativas ao blog: "" = inicio, "sobre" = /b/<slug>/sobre
  navbar: [
    { label: "Início", url: "" },
    { label: "Categorias", url: "categorias" },
    { label: "Sobre", url: "sobre" },
  ],
  social_links: [],
};

export const DEFAULT_CATEGORIES = [
  {
    name: "Geral",
    slug: "geral",
    description: "Publicacoes gerais do blog.",
    color: "#6366f1",
  },
  {
    name: "Tutoriais",
    slug: "tutoriais",
    description: "Guias passo a passo.",
    color: "#0ea5e9",
  },
  {
    name: "Novidades",
    slug: "novidades",
    description: "Ultimas noticias e lancamentos.",
    color: "#f59e0b",
  },
];

/**
 * Cria um blog completo: registro + configuracao de aparencia + categorias iniciais.
 * Aceita um client de transacao para participar de uma transacao maior.
 *
 * @returns {Promise<{blog: object, settings: object}>}
 */
export async function createBlog(
  { name, slug, description = "" },
  client = null,
) {
  const run = client ? (sql, params) => client.query(sql, params) : query;
  const pick = client
    ? async (sql, params) => (await client.query(sql, params)).rows[0] ?? null
    : one;

  const blogName =
    String(name || "")
      .trim()
      .slice(0, 80) || "Novo Blog";
  const finalSlug = await uniqueBlogSlug(slug || blogName, null, pick);
  const storageFolder = await uniqueStorageFolder(finalSlug, pick);

  const inserted = await run(
    "INSERT INTO blogs (slug, storage_folder) VALUES ($1, $2) RETURNING *",
    [finalSlug, storageFolder],
  );
  const blog = inserted.rows[0];

  const settingsValues = {
    ...DEFAULT_SETTINGS,
    blog_name: blogName,
    description: description || DEFAULT_SETTINGS.description,
  };

  const settingsResult = await run(
    `INSERT INTO settings
       (blog_id, blog_name, tagline, description, primary_color, secondary_color, accent_color,
        text_color, background_color, surface_color, border_color, heading_font, body_font,
        border_radius, template, footer_text, navbar, social_links)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb)
     RETURNING *`,
    [
      blog.id,
      settingsValues.blog_name,
      settingsValues.tagline,
      settingsValues.description,
      settingsValues.primary_color,
      settingsValues.secondary_color,
      settingsValues.accent_color,
      settingsValues.text_color,
      settingsValues.background_color,
      settingsValues.surface_color,
      settingsValues.border_color,
      settingsValues.heading_font,
      settingsValues.body_font,
      settingsValues.border_radius,
      settingsValues.template,
      settingsValues.footer_text,
      JSON.stringify(settingsValues.navbar),
      JSON.stringify(settingsValues.social_links),
    ],
  );

  for (const category of DEFAULT_CATEGORIES) {
    await run(
      `INSERT INTO categories (blog_id, name, slug, description, color)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (blog_id, slug) DO NOTHING`,
      [
        blog.id,
        category.name,
        category.slug,
        category.description,
        category.color,
      ],
    );
  }

  return { blog, settings: settingsResult.rows[0] };
}

const BLOG_COLUMNS = "id, slug, storage_folder, created_at, updated_at";

/**
 * Busca um blog e sua configuracao de aparencia.
 *
 * Sao DUAS consultas de proposito: juntar blogs com settings num unico SELECT
 * ("s.*") produziria duas colunas chamadas "id" e o driver sobrescreveria uma
 * pela outra — bug silencioso que so aparece com mais de um blog.
 *
 * @param {{id?: number, slug?: string}} ref
 */
export async function getBlogWithSettings({ id, slug }) {
  const blog =
    id !== undefined && id !== null
      ? await one(`SELECT ${BLOG_COLUMNS} FROM blogs WHERE id = $1`, [id])
      : await one(`SELECT ${BLOG_COLUMNS} FROM blogs WHERE slug = $1`, [slug]);

  if (!blog) return null;

  const settings = await one("SELECT * FROM settings WHERE blog_id = $1", [
    blog.id,
  ]);
  return { blog, settings };
}

/** Middleware: carrega o blog pelo slug (rotas publicas). */
export async function loadBlogBySlug(req, res, next) {
  try {
    const blog = await one(
      `SELECT ${BLOG_COLUMNS} FROM blogs WHERE slug = $1`,
      [String(req.params.blogSlug || "")],
    );

    if (!blog) return res.status(404).json({ error: "Blog nao encontrado." });

    req.blog = blog;
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware: carrega o blog pelo id (rotas administrativas). */
export async function loadBlogById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.blogId, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Identificador de blog invalido." });
    }

    const blog = await one(`SELECT ${BLOG_COLUMNS} FROM blogs WHERE id = $1`, [
      id,
    ]);
    if (!blog) return res.status(404).json({ error: "Blog nao encontrado." });

    req.blog = blog;
    return next();
  } catch (err) {
    return next(err);
  }
}
