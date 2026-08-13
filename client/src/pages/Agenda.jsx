import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import AppointmentModal from '../components/AppointmentModal';
import BlockDayModal from '../components/BlockDayModal';
import { useAuth } from '../context/AuthContext';
import {
  addDays,
  formatDayHeader,
  formatTime,
  formatWeekRange,
  isSameDay,
  startOfWeek,
  toISODateOnly,
} from '../lib/date';

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i
);
const HOUR_HEIGHT = 60;
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

const STATUS_COLOR = {
  pending: { color: 'var(--status-warning)', background: 'var(--status-warning-bg)' },
  confirmed: { color: 'var(--status-good)', background: 'var(--status-good-bg)' },
  completed: { color: 'var(--status-good)', background: 'var(--status-good-bg)' },
  cancelled: { color: 'var(--status-critical)', background: 'var(--status-critical-bg)' },
  no_show: { color: 'var(--status-serious)', background: 'var(--status-serious-bg)' },
};

export default function Agenda() {
  const { admin } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState(null);
  const [blockedDays, setBlockedDays] = useState([]);
  const [blockModalDate, setBlockModalDate] = useState(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const blockedByDate = useMemo(() => {
    const map = new Map();
    blockedDays.forEach((b) => map.set(b.date, b));
    return map;
  }, [blockedDays]);

  const loadAppointments = () => {
    setLoading(true);
    const from = weekStart;
    const to = addDays(weekStart, 7);

    api
      .get('/agenda/appointments', {
        params: { from: from.toISOString(), to: to.toISOString() },
      })
      .then((res) => setAppointments(res.data.data))
      .finally(() => setLoading(false));
  };

  const loadBlockedDays = () => {
    api.get('/agenda/blocked-days').then((res) => setBlockedDays(res.data.data));
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    loadBlockedDays();
  }, []);

  const handleUnblock = async (dateStr) => {
    const confirmed = window.confirm(
      `¿Desbloquear el ${dateStr}? Ese día vuelve a estar disponible para agendar citas.`
    );
    if (!confirmed) return;

    await api.delete(`/admin/blocked-days/${dateStr}`);
    loadBlockedDays();
  };

  const appointmentsByDay = (day) => {
    const dayAppointments = appointments
      .filter((a) => isSameDay(new Date(a.startTime), day))
      .map((a) => ({
        ...a,
        start: new Date(a.startTime),
        end: new Date(a.endTime),
      }))
      .sort((a, b) => a.start - b.start);

    // Group appointments that overlap in time, then assign each one a
    // column within its group so concurrent appointments render side by
    // side instead of stacking exactly on top of each other.
    const clusters = [];
    let cluster = [];
    let clusterEnd = -Infinity;

    for (const appointment of dayAppointments) {
      if (cluster.length && appointment.start >= clusterEnd) {
        clusters.push(cluster);
        cluster = [];
        clusterEnd = -Infinity;
      }
      cluster.push(appointment);
      clusterEnd = Math.max(clusterEnd, appointment.end);
    }
    if (cluster.length) {
      clusters.push(cluster);
    }

    return clusters.flatMap((group) => {
      const columnEndTimes = [];
      const columnByAppointment = new Map();

      for (const appointment of group) {
        let column = columnEndTimes.findIndex((end) => end <= appointment.start);
        if (column === -1) {
          column = columnEndTimes.length;
          columnEndTimes.push(appointment.end);
        } else {
          columnEndTimes[column] = appointment.end;
        }
        columnByAppointment.set(appointment._id, column);
      }

      const totalColumns = columnEndTimes.length;

      return group.map((appointment) => ({
        ...appointment,
        column: columnByAppointment.get(appointment._id),
        totalColumns,
      }));
    });
  };

  const openCreateAt = (day, hour, minute) => {
    const date = new Date(day);
    date.setHours(hour, minute, 0, 0);
    setModalState({ mode: 'create', initialDate: date });
  };

  const openEdit = (appointment) => {
    setModalState({ mode: 'edit', appointment });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Agenda
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            {formatWeekRange(weekStart)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
          >
            ‹
          </button>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
          >
            ›
          </button>
          <button
            onClick={() => openCreateAt(new Date(), new Date().getHours(), 0)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            + Nueva cita
          </button>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex min-w-[860px]">
          <div className="w-14 shrink-0" />
          {days.map((day) => {
            const dateStr = toISODateOnly(day);
            const blocked = blockedByDate.get(dateStr);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 border-l px-2 py-2 text-center text-xs font-medium"
                style={{
                  borderColor: 'var(--border)',
                  color: isSameDay(day, new Date()) ? 'var(--accent)' : 'var(--ink)',
                }}
              >
                <div>{formatDayHeader(day)}</div>
                {admin?.role === 'admin' && (
                  blocked ? (
                    <button
                      type="button"
                      onClick={() => handleUnblock(dateStr)}
                      className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
                      title={blocked.reason || 'Día bloqueado'}
                    >
                      Bloqueado — desbloquear
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBlockModalDate(dateStr)}
                      className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ color: 'var(--ink-muted)' }}
                    >
                      Bloquear día
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>

        <div className="flex min-w-[860px]">
          <div className="w-14 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="pr-2 text-right text-xs"
              >
                <span style={{ color: 'var(--ink-muted)' }}>{`${hour}:00`}</span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const blocked = blockedByDate.get(toISODateOnly(day));

            return (
            <div
              key={day.toISOString()}
              className="relative flex-1 border-l"
              style={{ borderColor: 'var(--border)', height: GRID_HEIGHT }}
            >
              {blocked && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-center text-xs font-medium"
                  style={{ background: 'var(--status-critical-bg)', color: 'var(--status-critical)' }}
                >
                  No laborable{blocked.reason ? ` — ${blocked.reason}` : ''}
                </div>
              )}

              {!blocked && HOURS.map((hour) => (
                <div key={hour} style={{ height: HOUR_HEIGHT }} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => openCreateAt(day, hour, 0)}
                    className="h-1/2 w-full border-t hover:opacity-70"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => openCreateAt(day, hour, 30)}
                    className="h-1/2 w-full hover:opacity-70"
                  />
                </div>
              ))}

              {appointmentsByDay(day).map((appointment) => {
                const { start, end, column, totalColumns } = appointment;
                const top =
                  ((start.getHours() - DAY_START_HOUR) * 60 + start.getMinutes()) *
                  (HOUR_HEIGHT / 60);
                const height = Math.max(
                  ((end - start) / 60000) * (HOUR_HEIGHT / 60),
                  20
                );
                const colors = STATUS_COLOR[appointment.status] || STATUS_COLOR.pending;
                const widthPct = 100 / totalColumns;

                return (
                  <button
                    type="button"
                    key={appointment._id}
                    onClick={() => openEdit(appointment)}
                    className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs shadow-sm"
                    style={{
                      top,
                      height,
                      left: `calc(${column * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      color: colors.color,
                      background: colors.background,
                    }}
                  >
                    <p className="truncate font-medium">
                      {formatTime(start)} {appointment.customer?.name}
                    </p>
                    <p className="truncate opacity-80">{appointment.service?.name}</p>
                  </button>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-muted)' }}>
          Cargando...
        </p>
      )}

      {modalState && (
        <AppointmentModal
          mode={modalState.mode}
          initialDate={modalState.initialDate}
          appointment={modalState.appointment}
          onClose={() => setModalState(null)}
          onSaved={() => {
            setModalState(null);
            loadAppointments();
          }}
        />
      )}

      {blockModalDate && (
        <BlockDayModal
          date={blockModalDate}
          dateLabel={blockModalDate}
          onClose={() => setBlockModalDate(null)}
          onBlocked={() => {
            setBlockModalDate(null);
            loadBlockedDays();
          }}
        />
      )}
    </div>
  );
}
