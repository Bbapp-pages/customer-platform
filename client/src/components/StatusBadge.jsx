const STATUS_ROLE = {
  // Appointment statuses
  pending: 'warning',
  confirmed: 'good',
  completed: 'good',
  cancelled: 'critical',
  no_show: 'serious',

  // Participant statuses
  REGISTERED: 'muted',
  SELECTED: 'accent',
  CONTACTED: 'accent',
  SCHEDULED: 'good',
  ATTENDED: 'good',
  NO_SHOW: 'serious',
  CANCELLED: 'critical',
  EXPIRED: 'muted',

  // Prize statuses
  AVAILABLE: 'accent',
  REDEEMED: 'good',
};

const ROLE_STYLE = {
  good: { color: 'var(--status-good)', background: 'var(--status-good-bg)' },
  warning: {
    color: 'var(--status-warning)',
    background: 'var(--status-warning-bg)',
  },
  serious: {
    color: 'var(--status-serious)',
    background: 'var(--status-serious-bg)',
  },
  critical: {
    color: 'var(--status-critical)',
    background: 'var(--status-critical-bg)',
  },
  muted: { color: 'var(--status-muted)', background: 'var(--status-muted-bg)' },
  accent: { color: 'var(--accent)', background: 'var(--accent-bg)' },
};

export default function StatusBadge({ status }) {
  const role = STATUS_ROLE[status] || 'muted';
  const style = ROLE_STYLE[role];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ color: style.color, background: style.background }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: style.color }}
      />
      {status}
    </span>
  );
}
