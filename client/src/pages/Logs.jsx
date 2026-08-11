import { useEffect, useState } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';

const TYPES = ['whatsapp_send', 'email_send', 'campaign_followup', 'gemini', 'webhook'];

const TYPE_LABEL = {
  whatsapp_send: 'Envío WhatsApp',
  email_send: 'Envío de correo',
  campaign_followup: 'Seguimiento de campaña',
  gemini: 'Gemini',
  webhook: 'Webhook',
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/logs', {
        params: { page: pagination.page, limit: 20, type: type || undefined },
      })
      .then((res) => {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [pagination.page, type]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Actividad
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            Errores registrados por el sistema (envíos fallidos, webhooks, etc.).
          </p>
        </div>

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
        >
          <option value="">Todos los tipos</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
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
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {!loading && logs.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  Sin errores registrados.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log._id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--ink-secondary)' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
                  >
                    {TYPE_LABEL[log.type] || log.type}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>
                  {log.message}
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
