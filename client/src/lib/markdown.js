import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

/**
 * Blocos de alinhamento:
 *
 *     ::: center
 *     conteudo
 *     :::
 *
 * O alinhamento e aplicado DEPOIS de o Markdown virar HTML. Fazer o contrario
 * (envolver o Markdown) quebraria titulos, listas, citacoes e blocos de codigo,
 * porque esses construtores deixam de ser interpretados dentro de HTML.
 */
const ALIGN_BLOCK_RE = /^:::[ \t]*(left|center|right|justify)[ \t]*\r?\n([\s\S]*?)^:::[ \t]*$/gm;

/** Converte markdown em HTML sanitizado (seguro para dangerouslySetInnerHTML). */
export function renderMarkdown(markdown) {
  if (!markdown) return '';

  const source = String(markdown);
  const parts = [];

  // Regex criada a cada chamada: evita estado de lastIndex compartilhado.
  const re = new RegExp(ALIGN_BLOCK_RE.source, 'gm');
  let last = 0;
  let match;

  while ((match = re.exec(source)) !== null) {
    if (match.index > last) {
      parts.push({ html: marked.parse(source.slice(last, match.index)) });
    }
    parts.push({ align: match[1], html: marked.parse(match[2]) });
    last = match.index + match[0].length;
  }

  if (last < source.length) {
    parts.push({ html: marked.parse(source.slice(last)) });
  }

  const html = parts
    .map((part) =>
      part.align && part.align !== 'left'
        ? `<div class="align-${part.align}">${part.html}</div>`
        : part.html
    )
    .join('\n');

  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  });
}

/** Extrai um texto puro (para resumos / contagem de palavras). */
export function toPlainText(markdown, max = 0) {
  const text = String(markdown || '')
    // Remove os marcadores de alinhamento para nao vazarem no resumo do post.
    .replace(/^:::[ \t]*(left|center|right|justify)[ \t]*$/gm, ' ')
    .replace(/^:::[ \t]*$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return max ? text.slice(0, max) : text;
}

export function countWords(markdown) {
  const plain = toPlainText(markdown);
  return plain ? plain.split(/\s+/).length : 0;
}

export function readingTime(markdown) {
  const words = countWords(markdown);
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(value, opts) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

export function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `${minutes} min atras`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h atras`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d atras`;
  return formatDate(value);
}
