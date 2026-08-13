import { useEffect, useState } from 'react';
import api from '../api/client';

export default function BlockDayModal({ date, dateLabel, onClose, onBlocked }) {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [affected, setAffected] = useState([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/blocked-days/preview', { params: { date } })
      .then((res) => setAffected(res.data.data.affected))
      .catch(() => setError('No se pudo consultar el impacto de este día.'))
      .finally(() => setLoadingPreview(false));
  }, [date]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');

    try {
      await api.post('/admin/blocked-days', { date, reason: reason.trim() });
      onBlocked();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo bloquear el día');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Bloquear {dateLabel}
        </h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Marca este día como no laborable. No se van a poder agendar citas nuevas ahí (ni desde
          el chat de campaña ni desde esta agenda) hasta que lo desbloquees.
        </p>

        <div
          className="mb-4 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--status-critical)', background: 'var(--status-critical-bg)', color: 'var(--status-critical)' }}
        >
          {loadingPreview ? (
            'Revisando si ese día ya tiene citas agendadas…'
          ) : affected.length === 0 ? (
            'Este día todavía no tiene citas agendadas. Aun así, una vez bloqueado no se podrá agendar nada nuevo ahí hasta que lo desbloquees.'
          ) : (
            <>
              <strong>Atención:</strong> este día ya tiene {affected.length}{' '}
              {affected.length === 1 ? 'cita agendada' : 'citas agendadas'}. Si lo bloqueas, vas a
              tener que <strong>contactar manualmente a cada paciente para reagendar su cita</strong> —
              el sistema no lo hace solo. Se le va a avisar a los demás admins y se enviará un
              correo a gerencia con esta lista de pacientes.
            </>
          )}
        </div>

        {affected.length > 0 && (
          <div
            className="mb-4 max-h-40 overflow-y-auto rounded-lg border text-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            {affected.map((a) => (
              <div key={a.id} className="border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <p className="font-medium" style={{ color: 'var(--ink)' }}>
                  {a.time} — {a.customerName} ({a.serviceName})
                </p>
                <p style={{ color: 'var(--ink-muted)' }}>
                  {a.customerPhone} · {a.customerEmail}
                </p>
              </div>
            ))}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Motivo (opcional)
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. cierre por mantenimiento"
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)', background: 'var(--surface)' }}
        />

        {error && (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || loadingPreview}
            onClick={handleConfirm}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--status-critical)' }}
          >
            {submitting ? 'Bloqueando...' : 'Confirmar bloqueo'}
          </button>
        </div>
      </div>
    </div>
  );
}
