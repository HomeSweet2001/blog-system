import { useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, UploadCloud } from 'lucide-react';
import { uploadImage } from '../../lib/api.js';
import { useBlog } from '../../context/BlogContext.jsx';
import { Alert, Spinner } from './Feedback.jsx';

/**
 * Campo reutilizavel para imagens: upload para o Cloudinary OU colar uma URL.
 * `value` = URL da imagem | `onChange(url)`.
 */
export default function ImageField({
  value,
  onChange,
  label = 'Imagem',
  folder = 'uploads',
  hint,
  aspect = 'aspect-video',
}) {
  const { blog } = useBlog();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [urlMode, setUrlMode] = useState(false);

  const blogId = blog?.id;

  async function handleFile(file) {
    if (!file) return;

    if (!blogId) {
      setError('Selecione um blog antes de enviar imagens.');
      return;
    }

    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const result = await uploadImage(file, folder, blogId, setProgress);
      onChange(result.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      {label && <span className="label">{label}</span>}

      <div
        className={`card relative flex ${aspect} w-full items-center justify-center overflow-hidden`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-contain" />
            <div className="absolute right-2 top-2 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="btn btn-ghost bg-white/90 px-2.5 py-1.5 text-xs"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="btn btn-ghost bg-white/90 px-2.5 py-1.5 text-xs text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm opacity-70 transition hover:opacity-100"
          >
            {busy ? <Spinner /> : <ImagePlus className="h-6 w-6" />}
            <span>{busy ? `Enviando... ${progress}%` : 'Clique ou arraste uma imagem'}</span>
            <span className="text-xs opacity-70">PNG, JPG, WEBP, GIF, SVG</span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--c-primary)' }}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-70 hover:opacity-100"
          onClick={() => setUrlMode((v) => !v)}
        >
          <Link2 className="h-3.5 w-3.5" />
          {urlMode ? 'Ocultar URL' : 'Usar URL externa'}
        </button>
        {hint && <span className="text-xs opacity-60">{hint}</span>}
      </div>

      {urlMode && (
        <input
          type="url"
          className="input mt-2"
          placeholder="https://..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )}

      {error && (
        <div className="mt-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}

/** Botao compacto de upload usado dentro de formularios. */
export function UploadButton({ onUploaded, folder = 'uploads', label = 'Enviar imagem' }) {
  const { blog } = useBlog();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        {busy ? <Spinner className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const result = await uploadImage(file, folder, blog?.id);
            onUploaded(result.url);
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = '';
          }
        }}
      />
    </>
  );
}
