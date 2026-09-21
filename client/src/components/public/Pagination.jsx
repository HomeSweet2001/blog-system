import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;

  const pages = [];
  const push = (p) => {
    if (!pages.includes(p) && p >= 1 && p <= totalPages) pages.push(p);
  };

  push(1);
  for (let p = page - 1; p <= page + 1; p += 1) push(p);
  push(totalPages);
  pages.sort((a, b) => a - b);

  const items = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push({ type: 'gap', key: `gap-${p}` });
    items.push({ type: 'page', value: p, key: p });
  });

  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        className="btn btn-ghost h-10 w-10 !px-0"
        disabled={!pagination.hasPrev}
        onClick={() => onPage(page - 1)}
        aria-label="Pagina anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item) =>
        item.type === 'gap' ? (
          <span key={item.key} className="px-2 opacity-50">
            ...
          </span>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={() => onPage(item.value)}
            className="btn h-10 min-w-10 !px-3"
            style={
              item.value === page
                ? { background: 'var(--c-primary)', color: '#fff' }
                : { border: '1px solid var(--c-border)' }
            }
          >
            {item.value}
          </button>
        )
      )}

      <button
        type="button"
        className="btn btn-ghost h-10 w-10 !px-0"
        disabled={!pagination.hasNext}
        onClick={() => onPage(page + 1)}
        aria-label="Proxima pagina"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
