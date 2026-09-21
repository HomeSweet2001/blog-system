import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`h-5 w-5 animate-spin-slow ${className}`} />;
}

export function FullPageLoader({ label = 'Carregando...' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 opacity-70">
      <Spinner className="h-7 w-7" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'var(--c-surface)' }}
        >
          <Icon className="h-6 w-6 opacity-60" />
        </div>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="max-w-md text-sm opacity-70">{description}</p>}
      {action}
    </div>
  );
}

export function Alert({ variant = 'info', children }) {
  if (!children) return null;
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-800',
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };
  return (
    <div className={`rounded-theme border px-4 py-3 text-sm ${styles[variant]}`}>{children}</div>
  );
}

export function Badge({ color, children }) {
  return (
    <span
      className="chip"
      style={{
        backgroundColor: `${color}1f`,
        color,
      }}
    >
      {children}
    </span>
  );
}
