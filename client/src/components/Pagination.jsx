export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span style={{ color: 'var(--ink-muted)' }}>
        Página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border px-3 py-1 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
        >
          Anterior
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border px-3 py-1 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
