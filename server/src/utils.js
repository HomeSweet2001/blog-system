/** Utilitarios compartilhados pelas rotas. */
import slugify from 'slugify';

export function makeSlug(text, fallback = 'post') {
  const slug = slugify(String(text || ''), {
    lower: true,
    strict: true,
    locale: 'pt',
    trim: true,
  });
  return slug || `${fallback}-${Date.now().toString(36)}`;
}

/**
 * Garante slug unico DENTRO DE UM BLOG.
 * Com varios blogs, cada um pode ter um post com o mesmo slug.
 */
export async function uniqueScopedSlug(table, desired, blogId, ignoreId = null, runner = one) {
  const base = makeSlug(desired);
  let candidate = base;
  let i = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = ignoreId ? [blogId, candidate, ignoreId] : [blogId, candidate];
    const sql = ignoreId
      ? `SELECT id FROM ${table} WHERE blog_id = $1 AND slug = $2 AND id <> $3`
      : `SELECT id FROM ${table} WHERE blog_id = $1 AND slug = $2`;
    const row = await runner(sql, params);
    if (!row) return candidate;
    candidate = `${base}-${++i}`;
  }
}

/** Garante slug unico dentro da tabela informada (tabelas sem blog_id). */
export async function uniqueSlug(table, desired, ignoreId = null, queryFn) {
  const base = makeSlug(desired);
  let candidate = base;
  let i = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = ignoreId ? [candidate, ignoreId] : [candidate];
    const sql = ignoreId
      ? `SELECT id FROM ${table} WHERE slug = $1 AND id <> $2`
      : `SELECT id FROM ${table} WHERE slug = $1`;
    const row = await queryFn(sql, params);
    if (!row) return candidate;
    candidate = `${base}-${++i}`;
  }
}

export function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Normaliza uma string de URL/identificador. */
export function safeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return trimmed;
}

export function pickHexColor(value, fallback = '#000000') {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || '')) ? value : fallback;
}

/** Converte Markdown em texto corrido (usado no resumo e na busca). */
export function plainTextFromMarkdown(markdown, max = 0) {
  const text = String(markdown || '')
    // Remove os marcadores de alinhamento (:::)
    .replace(/^:::[ \t]*(left|center|right|justify)[ \t]*$/gm, ' ')
    .replace(/^:::[ \t]*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return max ? text.slice(0, max) : text;
}

/**
 * Define o resumo de uma publicacao.
 *
 * @returns {{text: string, auto: boolean}}
 *   `auto: true`  -> foi gerado a partir do conteudo (o autor deixou em branco)
 *   `auto: false` -> o autor escreveu o resumo
 *
 * Essa distincao existe porque a pagina do post NAO deve repetir o resumo
 * automatico como "lead": ele seria o proprio inicio do conteudo, aparecendo
 * duas vezes para o leitor. Nas listagens ele continua sendo usado normalmente.
 */
export function buildExcerpt(content, provided) {
  const authored = String(provided || '').trim();

  if (authored) {
    return { text: authored.slice(0, 500), auto: false };
  }

  return { text: plainTextFromMarkdown(content, 220), auto: true };
}
