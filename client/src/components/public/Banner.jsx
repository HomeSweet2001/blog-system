import { useSettings } from '../../context/SettingsContext.jsx';

export default function Banner({ postCount }) {
  const { settings } = useSettings();

  if (!settings.show_banner) return null;

  const hasImage = Boolean(settings.banner_url);
  const title = settings.banner_title || settings.blog_name;
  const subtitle = settings.banner_subtitle || settings.tagline;

  // banner_overlay vem do Postgres como string (NUMERIC) — converte com seguranca.
  const rawOverlay = Number(settings.banner_overlay);
  const overlay = Number.isFinite(rawOverlay) ? rawOverlay : 0.45;

  return (
    <section className="relative overflow-hidden">
      {hasImage ? (
        <div className="absolute inset-0">
          <img src={settings.banner_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, var(--c-primary), var(--c-secondary) 85%)`,
          }}
        />
      )}

      <div className="relative mx-auto max-w-content px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1
          className="mx-auto max-w-3xl font-heading text-3xl font-black leading-tight text-white drop-shadow-sm sm:text-5xl"
          style={hasImage ? undefined : { color: '#fff' }}
        >
          {title}
        </h1>

        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            {subtitle}
          </p>
        )}

        {settings.description && (
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-white/75">
            {settings.description}
          </p>
        )}

        {typeof postCount === 'number' && (
          <p className="mt-6 inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
            {postCount} {postCount === 1 ? 'publicacao' : 'publicacoes'}
          </p>
        )}
      </div>
    </section>
  );
}
