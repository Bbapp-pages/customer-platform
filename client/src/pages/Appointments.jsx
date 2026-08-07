import { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/appointments', {
        params: { page: pagination.page, limit: 10, status: status || undefined },
      })
      .then((res) => {
        setAppointments(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [pagination.page, status]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Citas
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            Historial de citas agendadas.
          </p>
        </div>

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
            </tr>
          </thead>
          <tbody>
            {!loading && appointments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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
