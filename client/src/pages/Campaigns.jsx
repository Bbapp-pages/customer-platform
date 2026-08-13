import { useEffect, useState } from 'react';
import api from '../api/client';
import CampaignModal from '../components/CampaignModal';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCampaign, setModalCampaign] = useState(undefined);
  const [deletingId, setDeletingId] = useState(null);

  const loadCampaigns = () => {
    setLoading(true);
    return api
      .get('/admin/campaigns')
      .then((res) => setCampaigns(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleDelete = async (campaign) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la campaña "${campaign.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(campaign._id);

    try {
      await api.delete(`/admin/campaigns/${campaign._id}`);
      await loadCampaigns();
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo eliminar la campaña');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Campañas
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            Campañas promocionales configuradas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalCampaign(null)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          + Nueva campaña
        </button>
      </div>

      {!loading && campaigns.length === 0 && (
        <p style={{ color: 'var(--ink-muted)' }}>No hay campañas todavía.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign._id}
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
                {campaign.name}
              </h2>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  color: campaign.active
                    ? 'var(--status-good)'
                    : 'var(--status-muted)',
                  background: campaign.active
                    ? 'var(--status-good-bg)'
                    : 'var(--status-muted-bg)',
                }}
              >
                {campaign.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>

            <p className="mb-3 text-sm" style={{ color: 'var(--ink-secondary)' }}>
              {campaign.description || 'Sin descripción.'}
            </p>

            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              Inicio de reservas:{' '}
              {new Date(campaign.firstBookingDate).toLocaleDateString()}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {campaign.services?.map((service) => (
                <span
                  key={service._id}
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ color: 'var(--accent)', background: 'var(--accent-bg)' }}
                >
                  {service.name}
                </span>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setModalCampaign(campaign)}
                className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
              >
                Editar
              </button>
              <button
                type="button"
                disabled={deletingId === campaign._id}
                onClick={() => handleDelete(campaign)}
                className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalCampaign !== undefined && (
        <CampaignModal
          campaign={modalCampaign}
          onClose={() => setModalCampaign(undefined)}
          onSaved={() => {
            setModalCampaign(undefined);
            loadCampaigns();
          }}
        />
      )}
    </div>
  );
}
