import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/campaigns')
      .then((res) => setCampaigns(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Campañas
      </h1>
      <p className="mt-1 mb-6 text-sm" style={{ color: 'var(--ink-secondary)' }}>
        Campañas promocionales configuradas.
      </p>

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
          </div>
        ))}
      </div>
    </div>
  );
}
