export default function StatCard({ label, value, hint }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={{ color: 'var(--ink)' }}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
