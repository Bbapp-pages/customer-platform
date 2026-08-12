import { useEffect, useState } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import ParticipantModal from '../components/ParticipantModal';

const STATUSES = [
  'REGISTERED',
  'SELECTED',
  'CONTACTED',
  'SCHEDULED',
  'ATTENDED',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
];

const SKIN_CONCERN_LABELS = {
  MANCHAS_PIGMENTACION: 'Manchas y pigmentación',
  CICATRICES_ACNE: 'Cicatrices de acné',
  ARRUGAS_LINEAS: 'Arrugas y líneas de expresión',
  TEXTURA_POROS: 'Textura y poros',
  REJUVENECIMIENTO_GENERAL: 'Rejuvenecimiento general',
  OTRO: 'Otro',
};

export default function Participants() {
  const [participants, setParticipants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);

  const toggleMenu = (e, participantId) => {
    if (menuOpenId === participantId) {
      setMenuOpenId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 192 });
    setMenuOpenId(participantId);
  };

  const loadParticipants = () => {
    setLoading(true);
    return api
      .get('/admin/participants', {
        params: {
          page: pagination.page,
          limit: 10,
          status: status || undefined,
          q: query || undefined,
        },
      })
      .then((res) => {
        setParticipants(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, status, query]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleStatusChange = async (participant, newStatus) => {
    setUpdatingId(participant._id);

    try {
      await api.patch(`/admin/participants/${participant._id}`, {
        status: newStatus,
      });
      await loadParticipants();
    } catch (err) {
      window.alert(
        err.response?.data?.message || 'No se pudo actualizar el estado'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleContactNow = async (participant) => {
    setMenuOpenId(null);
    setUpdatingId(participant._id);

    try {
      await api.post(`/admin/participants/${participant._id}/contact-now`);
      await loadParticipants();
    } catch (err) {
      window.alert(
        err.response?.data?.message || 'No se pudo enviar el mensaje'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (participant) => {
    setMenuOpenId(null);

    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar a ${participant.name}? Esto borra su registro y su cita (si tiene) de forma permanente y no se puede deshacer.`
    );
    if (!confirmed) {
      return;
    }

    setUpdatingId(participant._id);

    try {
      await api.delete(`/admin/participants/${participant._id}`);
      await loadParticipants();
    } catch (err) {
      window.alert(
        err.response?.data?.message || 'No se pudo eliminar el participante'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Participantes
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            Personas registradas en campañas.
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
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            + Nuevo participante
          </button>
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--ink-muted)' }}>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Campaña</th>
              <th className="px-4 py-3 font-medium">Premio</th>
              <th className="px-4 py-3 font-medium">Interés</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && participants.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  Sin resultados.
                </td>
              </tr>
            )}
            {participants.map((participant) => (
              <tr
                key={participant._id}
                className="border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>
                  {participant.name}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {participant.phone}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {participant.campaign?.name || '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {participant.prize?.service?.name || '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {SKIN_CONCERN_LABELS[participant.skinConcern] || '—'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={participant.status}
                    disabled={updatingId === participant._id}
                    onChange={(e) => handleStatusChange(participant, e.target.value)}
                    className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => toggleMenu(e, participant._id)}
                    className="rounded-lg border px-2 py-1 text-xs font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
                  >
                    Opciones ▾
                  </button>

                  {menuOpenId === participant._id && menuPosition && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                      <div
                        className="fixed z-20 w-48 rounded-lg border py-1 text-left shadow-lg"
                        style={{
                          top: menuPosition.top,
                          left: menuPosition.left,
                          background: 'var(--surface)',
                          borderColor: 'var(--border)',
                        }}
                      >
                        {participant.status === 'SELECTED' && !participant.contactedAt && (
                          <button
                            type="button"
                            disabled={updatingId === participant._id}
                            onClick={() => handleContactNow(participant)}
                            className="block w-full px-3 py-2 text-left text-xs font-medium disabled:opacity-50"
                            style={{ color: 'var(--accent)' }}
                          >
                            Contactar ahora
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={updatingId === participant._id}
                          onClick={() => handleDelete(participant)}
                          className="block w-full px-3 py-2 text-left text-xs font-medium disabled:opacity-50"
                          style={{ color: '#dc2626' }}
                        >
                          Eliminar participante
                        </button>
                      </div>
                    </>
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

      {showCreateModal && (
        <ParticipantModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadParticipants();
          }}
        />
      )}
    </div>
  );
}
