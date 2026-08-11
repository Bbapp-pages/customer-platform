import { useEffect, useState } from 'react';
import api from '../api/client';

const inputStyle = {
  borderColor: 'var(--border)',
  color: 'var(--ink)',
  background: 'var(--surface)',
};

export default function ParticipantModal({ onClose, onSaved }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState('');
  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/campaigns').then((res) => {
      const active = res.data.data.filter((c) => c.active);
      setCampaigns(active);
      setCampaignId(active[0]?._id || '');
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!campaignId) {
      setError('Selecciona una campaña');
      return;
    }

    setSubmitting(true);

    try {
      await api.post(`/campaigns/${campaignId}/participants`, {
        name,
        documentId,
        phone,
        email,
      });

      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el participante');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Nuevo participante
        </h2>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Campaña
        </label>
        <select
          required
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="">Selecciona una campaña</option>
          {campaigns.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Nombre
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Documento de identidad
        </label>
        <input
          required
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Teléfono
        </label>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Correo
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
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
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {submitting ? 'Guardando...' : 'Crear participante'}
          </button>
        </div>
      </form>
    </div>
  );
}
