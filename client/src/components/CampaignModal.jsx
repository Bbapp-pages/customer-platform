import { useEffect, useState } from 'react';
import api from '../api/client';

const inputStyle = {
  borderColor: 'var(--border)',
  color: 'var(--ink)',
  background: 'var(--surface)',
};

const toDateInputValue = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function CampaignModal({ campaign, onClose, onSaved }) {
  const [services, setServices] = useState([]);
  const [name, setName] = useState(campaign?.name || '');
  const [description, setDescription] = useState(campaign?.description || '');
  const [firstBookingDate, setFirstBookingDate] = useState(
    campaign ? toDateInputValue(campaign.firstBookingDate) : toDateInputValue(new Date())
  );
  const [active, setActive] = useState(campaign ? campaign.active : true);
  const [selectedServiceIds, setSelectedServiceIds] = useState(
    campaign?.services?.map((s) => s._id) || []
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/agenda/services').then((res) => setServices(res.data.data));
  }, []);

  const toggleService = (serviceId) => {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      name,
      description,
      firstBookingDate,
      active,
      services: selectedServiceIds,
    };

    try {
      if (campaign) {
        await api.patch(`/admin/campaigns/${campaign._id}`, payload);
      } else {
        await api.post('/admin/campaigns', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la campaña');
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
          {campaign ? 'Editar campaña' : 'Nueva campaña'}
        </h2>

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
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Fecha de inicio
        </label>
        <input
          required
          type="date"
          value={firstBookingDate}
          onChange={(e) => setFirstBookingDate(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Servicios incluidos
        </label>
        <div
          className="mb-4 rounded-lg border p-2 text-sm"
          style={{ borderColor: 'var(--border)' }}
        >
          {services.length === 0 && (
            <p style={{ color: 'var(--ink-muted)' }}>No hay servicios disponibles.</p>
          )}
          {services.map((service) => (
            <label key={service._id} className="flex items-center gap-2 px-1 py-1">
              <input
                type="checkbox"
                checked={selectedServiceIds.includes(service._id)}
                onChange={() => toggleService(service._id)}
              />
              <span style={{ color: 'var(--ink)' }}>{service.name}</span>
            </label>
          ))}
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink)' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Campaña activa
        </label>
        {active && (
          <p className="mb-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
            Solo puede haber una campaña activa a la vez — al guardar, cualquier otra campaña activa se desactivará automáticamente.
          </p>
        )}

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
            {submitting ? 'Guardando...' : campaign ? 'Guardar cambios' : 'Crear campaña'}
          </button>
        </div>
      </form>
    </div>
  );
}
