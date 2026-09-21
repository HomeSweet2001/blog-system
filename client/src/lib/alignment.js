/**
 * Alinhamento de blocos de conteudo.
 *
 * O Markdown nao tem sintaxe de alinhamento. Como o editor trabalha sobre texto
 * puro, usamos marcadores de bloco:
 *
 *     ::: center
 *     Meu texto **em negrito**
 *     :::
 *
 * O renderizador (lib/markdown.js) converte esses marcadores em
 * <div class="align-center">...</div> DEPOIS de o Markdown virar HTML — assim
 * funciona igualmente para paragrafos, titulos, listas, citacoes e imagens.
 *
 * As funcoes aqui sao puras (recebem e devolvem texto), o que permite testa-las
 * sem navegador.
 */

export const ALIGN_VALUES = ['left', 'center', 'right', 'justify'];

const OPEN_RE = /^:::[ \t]*(left|center|right|justify)[ \t]*$/;
const CLOSE_RE = /^:::[ \t]*$/;

/** Monta o bloco alinhado. */
export function wrapBlock(content, alignment) {
  return `::: ${alignment}\n${content}\n:::`;
}

/**
 * Procura uma regiao `::: align ... :::` que contenha a posicao informada.
 * Retorna os offsets absolutos, inclusive dos marcadores.
 */
export function findAlignRegion(text, pos) {
  const lines = String(text).split('\n');
  let offset = 0;
  let openStart = -1;
  let align = null;
  let contentStart = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineStart = offset;
    const lineEnd = offset + line.length;

    const openMatch = line.match(OPEN_RE);

    if (openMatch && openStart === -1) {
      openStart = lineStart;
      align = openMatch[1];
      contentStart = lineEnd + 1; // logo apos o \n do marcador de abertura
    } else if (CLOSE_RE.test(line) && openStart !== -1) {
      if (pos >= openStart && pos <= lineEnd) {
        return {
          start: openStart,
          end: lineEnd,
          align,
          contentStart,
          contentEnd: Math.max(contentStart, lineStart - 1),
        };
      }
      openStart = -1;
      align = null;
    }

    offset = lineEnd + 1;
  }

  return null;
}

/** Alinhamento aplicado na posicao informada ('left' quando nao ha nenhum). */
export function currentAlignment(text, pos) {
  const region = findAlignRegion(text, pos);
  return region ? region.align : 'left';
}

/**
 * Delimita os blocos (separados por linha em branco) que a selecao abrange.
 */
function blockRange(text, selStart, selEnd) {
  let start = text.lastIndexOf('\n\n', Math.max(0, selStart - 1));
  start = start === -1 ? 0 : start + 2;

  let end = text.indexOf('\n\n', selEnd);
  end = end === -1 ? text.length : end;

  return [start, end];
}

/**
 * Aplica (ou remove) o alinhamento nos blocos afetados pela selecao.
 *
 * - Clicar no mesmo alinhamento ja aplicado remove o alinhamento.
 * - "left" sempre remove (e o padrao).
 * - Selecao com varios paragrafos alinha cada um individualmente.
 *
 * @returns {{text: string, selectionStart: number, selectionEnd: number}}
 */
export function applyAlignment(text, selStart, selEnd, alignment) {
  const source = String(text ?? '');
  const start = Math.max(0, Math.min(selStart ?? 0, source.length));
  const end = Math.max(start, Math.min(selEnd ?? start, source.length));

  if (!ALIGN_VALUES.includes(alignment)) {
    return { text: source, selectionStart: start, selectionEnd: end };
  }

  // 1) A selecao ja esta dentro de um bloco alinhado -> troca ou remove.
  const region = findAlignRegion(source, start) || findAlignRegion(source, end);
  if (region) {
    const inner = source.slice(region.contentStart, region.contentEnd);
    const remove = alignment === 'left' || alignment === region.align;
    const replacement = remove ? inner : wrapBlock(inner, alignment);

    return {
      text: source.slice(0, region.start) + replacement + source.slice(region.end),
      selectionStart: region.start,
      selectionEnd: region.start + replacement.length,
    };
  }

  // 2) Blocos comuns separados por linha em branco.
  const [rangeStart, rangeEnd] = blockRange(source, start, end);
  const blocks = source.slice(rangeStart, rangeEnd).split(/\n{2,}/);

  const transformed = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return block;
      if (alignment === 'left') return trimmed;
      return wrapBlock(trimmed, alignment);
    })
    .join('\n\n');

  return {
    text: source.slice(0, rangeStart) + transformed + source.slice(rangeEnd),
    selectionStart: rangeStart,
    selectionEnd: rangeStart + transformed.length,
  };
}

/** Resumo do bloco atual (usado para rotular os botoes). */
export function describeBlockType(text, pos) {
  const region = findAlignRegion(text, pos);
  const sample = region
    ? text.slice(region.contentStart, region.contentEnd)
    : text.slice(...blockRange(text, pos, pos)).trim();

  const first = (sample.trim().split('\n')[0] || '').trim();
  if (/^#{1,6}\s/.test(first)) return 'titulo';
  if (/^[-*+]\s/.test(first) || /^\d+\.\s/.test(first)) return 'lista';
  if (/^>/.test(first)) return 'citacao';
  if (/^```/.test(first)) return 'codigo';
  if (/^!\[/.test(first)) return 'imagem';
  return 'paragrafo';
}
