import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { uploadImage } from "../../lib/api.js";
import { useBlog } from "../../context/BlogContext.jsx";
import { renderMarkdown, countWords, readingTime } from "../../lib/markdown.js";
import {
  applyAlignment,
  currentAlignment,
  describeBlockType,
} from "../../lib/alignment.js";
import { Spinner } from "../ui/Feedback.jsx";

const ALIGN_TOOLS = [
  { value: "left", icon: AlignLeft, title: "Alinhar a esquerda" },
  { value: "center", icon: AlignCenter, title: "Centralizar" },
  { value: "right", icon: AlignRight, title: "Alinhar a direita" },
  {
    value: "justify",
    icon: AlignJustify,
    title: "Justificar (texto simetrico)",
  },
];

const ALIGN_LABELS = {
  left: "a esquerda",
  center: "centralizado",
  right: "a direita",
  justify: "justificado",
};

const BLOCK_LABELS = {
  paragrafo: "paragrafo",
  titulo: "titulo",
  lista: "lista",
  citacao: "citacao",
  codigo: "bloco de codigo",
  imagem: "imagem",
};

/**
 * Editor de conteudo com barra de ferramentas (insere Markdown) e
 * pre-visualizacao ao vivo. Substitui o editor WYSIWYG sem dependencias pesadas.
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Escreva o conteudo...",
}) {
  const { blog } = useBlog();
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1 });
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeAlign, setActiveAlign] = useState("left");
  const [blockType, setBlockType] = useState("paragrafo");

  function pushHistory(next) {
    const { stack } = historyRef.current;
    stack.push(next);
    historyRef.current.index = stack.length - 1;
  }

  function commit(next) {
    pushHistory(next);
    onChange(next);
  }

  function wrap(before, after = before, placeholderText = "texto") {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const current = value || "";
    const selected = current.slice(start, end) || placeholderText;
    const next = `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`;
    commit(next);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }

  function prefixLines(prefix, placeholderText = "item") {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const current = value || "";
    const lineStart = current.lastIndexOf("\n", start - 1) + 1;
    const block = current.slice(lineStart, end) || placeholderText;
    const updated = block
      .split("\n")
      .map((line) => (line.trim() ? `${prefix}${line}` : line))
      .join("\n");
    const next = current.slice(0, lineStart) + updated + current.slice(end);
    commit(next);
    requestAnimationFrame(() => el.focus());
  }

  function insertAtCursor(text, wrapSelectionWith) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const current = value || "";
    let next;

    if (wrapSelectionWith) {
      next = `${current.slice(0, selectionStart)}${text}${current.slice(selectionStart, selectionEnd) || ""}${wrapSelectionWith}${current.slice(selectionEnd)}`;
    } else {
      next = `${current.slice(0, selectionStart)}${text}${current.slice(selectionEnd)}`;
    }
    commit(next);
    requestAnimationFrame(() => el.focus());
  }

  function undo() {
    const h = historyRef.current;
    if (h.index > 0) {
      h.index -= 1;
      onChange(h.stack[h.index]);
    }
  }

  function redo() {
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) {
      h.index += 1;
      onChange(h.stack[h.index]);
    }
  }

  /** Mantem os indicadores do rodape sincronizados com o cursor. */
  function syncCursorState() {
    const el = textareaRef.current;
    if (!el) return;
    const text = value || "";
    setActiveAlign(currentAlignment(text, el.selectionStart));
    setBlockType(describeBlockType(text, el.selectionStart));
  }

  /** Aplica ou remove o alinhamento no bloco onde o cursor esta. */
  function applyAlign(alignment) {
    const el = textareaRef.current;
    if (!el) return;

    const result = applyAlignment(
      value || "",
      el.selectionStart,
      el.selectionEnd,
      alignment,
    );
    commit(result.text);

    setActiveAlign(currentAlignment(result.text, result.selectionStart));
    setBlockType(describeBlockType(result.text, result.selectionStart));

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  async function handleImage(file) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage(file, "posts", blog?.id);
      insertAtCursor(
        `\n![${file.name.replace(/\.[^.]+$/, "")}](${result.url})\n`,
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const words = countWords(value);

  const tools = [
    { icon: Bold, title: "Negrito", action: () => wrap("**") },
    { icon: Italic, title: "Italico", action: () => wrap("_") },
    {
      icon: Heading2,
      title: "Titulo 2",
      action: () => prefixLines("## ", "Titulo"),
    },
    {
      icon: Heading3,
      title: "Titulo 3",
      action: () => prefixLines("### ", "Subtitulo"),
    },
    {
      icon: Link2,
      title: "Link",
      action: () => wrap("[", "](https://)", "texto do link"),
    },
    { icon: List, title: "Lista", action: () => prefixLines("- ") },
    {
      icon: ListOrdered,
      title: "Lista numerada",
      action: () => prefixLines("1. "),
    },
    { icon: Quote, title: "Citacao", action: () => prefixLines("> ") },
    {
      icon: Code2,
      title: "Bloco de codigo",
      action: () => wrap("\n```\n", "\n```\n", "codigo"),
    },
    {
      icon: ImageIcon,
      title: "Inserir imagem",
      action: () => fileRef.current?.click(),
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div
        className="flex flex-wrap items-center gap-1 border-b p-2"
        style={{
          borderColor: "var(--c-border)",
          background: "var(--c-surface)",
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            onClick={tool.action}
            className="btn btn-ghost !px-2 py-1.5"
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}

        <span
          className="mx-1 h-6 w-px"
          style={{ background: "var(--c-border)" }}
        />

        {ALIGN_TOOLS.map((tool) => {
          const active = activeAlign === tool.value;
          return (
            <button
              key={tool.value}
              type="button"
              title={tool.title}
              aria-pressed={active}
              onClick={() => applyAlign(tool.value)}
              className="btn btn-ghost !px-2 py-1.5"
              style={
                active
                  ? { background: "var(--c-primary)", color: "#fff" }
                  : undefined
              }
            >
              <tool.icon className="h-4 w-4" />
            </button>
          );
        })}

        <span
          className="mx-1 h-6 w-px"
          style={{ background: "var(--c-border)" }}
        />

        <button
          type="button"
          title="Desfazer"
          onClick={undo}
          className="btn btn-ghost !px-2 py-1.5"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Refazer"
          onClick={redo}
          className="btn btn-ghost !px-2 py-1.5"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          {uploading && (
            <span className="inline-flex items-center gap-1.5 text-xs opacity-70">
              <Spinner className="h-3.5 w-3.5" /> Enviando...
            </span>
          )}
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="btn btn-ghost !px-2.5 py-1.5 text-xs"
          >
            {preview ? (
              <Pencil className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {preview ? "Editar" : "Pre-visualizar"}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImage(e.target.files?.[0])}
      />

      {preview ? (
        <div className="min-h-[420px] p-5">
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(value || "_Nada para mostrar ainda._"),
            }}
          />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value || ""}
          onChange={(e) => {
            pushHistory(e.target.value);
            onChange(e.target.value);
            setActiveAlign(
              currentAlignment(e.target.value, e.target.selectionStart),
            );
            setBlockType(
              describeBlockType(e.target.value, e.target.selectionStart),
            );
          }}
          onSelect={syncCursorState}
          onKeyUp={syncCursorState}
          onClick={syncCursorState}
          placeholder={placeholder}
          spellCheck
          className="min-h-[420px] w-full resize-y border-0 bg-transparent p-5 font-mono text-sm leading-relaxed outline-none"
          style={{ color: "var(--c-text)" }}
        />
      )}

      <div
        className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-xs opacity-60"
        style={{ borderColor: "var(--c-border)" }}
      >
        <span>{words} palavras</span>
        <span className="inline-flex items-center gap-2">
          <span>{BLOCK_LABELS[blockType] || "paragrafo"}</span>
          {activeAlign !== "left" && (
            <span
              className="chip text-[11px]"
              style={{
                background: "var(--c-surface)",
                color: "var(--c-primary)",
              }}
            >
              {ALIGN_LABELS[activeAlign] || activeAlign}
            </span>
          )}
          <span>{readingTime(value)} min de leitura</span>
        </span>
      </div>
    </div>
  );
}
