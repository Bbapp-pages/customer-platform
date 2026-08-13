import { useEffect, useState } from 'react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABEL } from '../components/Layout';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

export default function Dashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let isFirstLoad = true;

    const fetchData = () =>
      Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/appointments', { params: { limit: 5 } }),
      ])
        .then(([statsRes, appointmentsRes]) => {
          if (cancelled) return;
          setStats(statsRes.data.data);
          setRecentAppointments(appointmentsRes.data.data);
          setError('');
        })
        .catch((err) => {
          if (cancelled) return;
          if (isFirstLoad) {
            setError('No se pudieron cargar las estadísticas');
          } else {
            console.error('Dashboard refresh error:', err);
          }
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
          isFirstLoad = false;
        });

    fetchData();
    const interval = setInterval(fetchData, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <p style={{ color: 'var(--ink-secondary)' }}>Cargando...</p>;
  }

  if (error) {
    return <p style={{ color: 'var(--status-critical)' }}>{error}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        {getGreeting()}, {admin?.name}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
        {ROLE_LABEL[admin?.role] || admin?.role}
      </p>
      <p className="mt-1 mb-6 text-sm" style={{ color: 'var(--ink-secondary)' }}>
        Estado general de citas, participantes y campañas.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Citas totales" value={stats.appointments.total} />
        <StatCard
          label="Participantes"
          value={stats.participants.total}
        />
        <StatCard
          label="Campañas activas"
          value={`${stats.campaigns.active} / ${stats.campaigns.total}`}
        />
        <StatCard label="Clientes" value={stats.customers.total} />
        <StatCard label="Errores (24h)" value={stats.errors.last24h} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Citas por estado"
          breakdown={stats.appointments.byStatus}
        />
        <BreakdownCard
          title="Participantes por estado"
          breakdown={stats.participants.byStatus}
        />
      </div>

      <div className="mt-8">
        <h2
          className="mb-3 text-lg font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          Últimas citas
        </h2>
        <div
          className="overflow-x-auto rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--ink-muted)' }}>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentAppointments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center"
                    style={{ color: 'var(--ink-muted)' }}
                  >
                    Sin citas registradas.
                  </td>
                </tr>
              )}
              {recentAppointments.map((appointment) => (
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
                    {new Date(appointment.startTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={appointment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({ title, breakdown }) {
  const entries = Object.entries(breakdown);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
          Sin datos todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map(([status, count]) => (
            <li key={status} className="flex items-center justify-between">
              <StatusBadge status={status} />
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
