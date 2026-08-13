import { useEffect, useState } from 'react';
import api from '../api/client';

export default function System() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [instructions, setInstructions] = useState([]);
  const [instructionsLoading, setInstructionsLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadStatus = () => {
    setStatusLoading(true);
    return api
      .get('/admin/system-status')
      .then((res) => setAiEnabled(res.data.data.aiEnabled))
      .finally(() => setStatusLoading(false));
  };

  const loadInstructions = () => {
    setInstructionsLoading(true);
    return api
      .get('/admin/custom-instructions')
      .then((res) => setInstructions(res.data.data))
      .finally(() => setInstructionsLoading(false));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    loadInstructions();
  }, []);

  const handleToggle = async () => {
    // Apagar el sistema tiene consecuencias reales e inmediatas: hay que
    // confirmar antes de mandar el PATCH. Encender de vuelta no las tiene.
    if (aiEnabled) {
      const confirmed = window.confirm(
        '¿Seguro que quieres apagar el sistema? La IA va a dejar de responder mensajes de WhatsApp de inmediato, incluyendo el contacto proactivo de la campaña y las solicitudes de retroalimentación, hasta que lo vuelvas a activar.'
      );
      if (!confirmed) {
        return;
      }
    }

    const nextValue = !aiEnabled;
    setStatusUpdating(true);

    try {
      const res = await api.patch('/admin/system-status', { aiEnabled: nextValue });
      setAiEnabled(res.data.data.aiEnabled);
    } catch (err) {
      window.alert(
        err.response?.data?.message || 'No se pudo actualizar el estado del sistema'
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) {
      window.alert('Escribe una instrucción antes de agregarla');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/admin/custom-instructions', { text: text.trim() });
      setText('');
      await loadInstructions();
    } catch (err) {
      window.alert(
        err.response?.data?.message || 'No se pudo agregar la instrucción'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (instruction) => {
    const confirmed = window.confirm(
      '¿Eliminar esta instrucción? La IA deja de seguirla de inmediato.'
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(instruction._id);

    try {
      await api.delete(`/admin/custom-instructions/${instruction._id}`);
      await loadInstructions();
    } catch (err) {
      window.alert(
        err.response?.data?.message || 'No se pudo eliminar la instrucción'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Sistema
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Control general de la IA y sus instrucciones personalizadas.
        </p>
      </div>

      <div
        className="mb-8 rounded-xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Estado del sistema
        </h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Cuando el sistema está apagado, la IA deja de responder cualquier mensaje
          de WhatsApp hasta que lo vuelvas a activar.
        </p>

        {statusLoading ? (
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            Cargando...
          </p>
        ) : (
          <button
            type="button"
            disabled={statusUpdating}
            onClick={handleToggle}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              color: aiEnabled ? 'var(--status-good)' : 'var(--status-critical)',
              background: aiEnabled ? 'var(--status-good-bg)' : 'var(--status-critical-bg)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: aiEnabled ? 'var(--status-good)' : 'var(--status-critical)' }}
            />
            {aiEnabled ? 'Sistema activo' : 'Sistema apagado'}
          </button>
        )}
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Instrucciones personalizadas
        </h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Reglas adicionales que la IA sigue al responder a los clientes por WhatsApp.
        </p>

        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
        >
          Lo que escribas aquí se convierte en una instrucción directa para la IA y
          puede cambiar cómo le responde a todos los clientes a partir de este
          momento. El cambio entra en vigor de inmediato, desde el siguiente mensaje
          que se responda, sin necesidad de reiniciar nada. Escríbela con cuidado y
          revísala antes de agregarla, porque afecta a todas las conversaciones en
          curso y futuras.
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej: Si el cliente pregunta por precios de cirugía, siempre aclara que se requiere una valoración presencial antes de dar un monto."
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              Agregar instrucción
            </button>
          </div>
        </form>

        <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Reglas activas
        </h3>

        {instructionsLoading ? (
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            Cargando...
          </p>
        ) : instructions.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            Sin instrucciones adicionales.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {instructions.map((instruction) => (
              <li
                key={instruction._id}
                className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-sm" style={{ color: 'var(--ink)' }}>
                    {instruction.text}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
                    {instruction.createdBy?.name} ·{' '}
                    {new Date(instruction.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deletingId === instruction._id}
                  onClick={() => handleDelete(instruction)}
                  className="shrink-0 rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--status-critical)' }}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
