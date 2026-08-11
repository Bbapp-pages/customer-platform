import { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const loadAppointments = () => {
    setLoading(true);
    return api
      .get('/admin/appointments', {
        params: {
          page: pagination.page,
          limit: 10,
          status: status || undefined,
          q: query || undefined,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        },
      })
      .then((res) => {
        setAppointments(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, status, query, from, to]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleCancel = async (appointment) => {
    if (!window.confirm('¿Cancelar esta cita?')) {
      return;
    }

    setCancellingId(appointment._id);

    try {
      await api.patch(`/agenda/appointments/${appointment._id}`, {
        status: 'cancelled',
      });
      await loadAppointments();
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo cancelar la cita');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Citas
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            Historial de citas agendadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          />
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--ink-muted)' }}>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Servicio</th>
              <th className="px-4 py-3 font-medium">Profesional</th>
              <th className="px-4 py-3 font-medium">Inicio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && appointments.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  Sin resultados.
                </td>
              </tr>
            )}
            {appointments.map((appointment) => (
              <tr
                key={appointment._id}
                className="border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>
                  {appointment.customer?.name || '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {appointment.service?.name || '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {appointment.employee?.name || '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {new Date(appointment.startTime).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={appointment.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {CANCELLABLE_STATUSES.includes(appointment.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancel(appointment)}
                      disabled={cancellingId === appointment._id}
                      className="text-sm font-medium disabled:opacity-50"
                      style={{ color: 'var(--status-critical)' }}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          onChange={(page) => setPagination((p) => ({ ...p, page }))}
        />
      </div>
    </div>
  );
}
