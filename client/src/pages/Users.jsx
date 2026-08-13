import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import UserModal from '../components/UserModal';

const ROLE_LABEL = { admin: 'Admin', receptionist: 'Recepcionista' };

export default function Users() {
  const { admin: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    return api
      .get('/admin/users')
      .then((res) => setUsers(res.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (user, role) => {
    setUpdatingId(user._id);

    try {
      await api.patch(`/admin/users/${user._id}`, { role });
      await loadUsers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo cambiar el rol');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (user) => {
    setUpdatingId(user._id);

    try {
      await api.patch(`/admin/users/${user._id}`, { active: !user.active });
      await loadUsers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'No se pudo actualizar el usuario');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Usuarios
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
            Cuentas del panel y sus roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          + Nuevo usuario
        </button>
      </div>

      <div
        className="overflow-x-auto rounded-xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--ink-muted)' }}>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center" style={{ color: 'var(--ink-muted)' }}>
                  Sin usuarios.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user._id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>
                  {user.name}
                  {user._id === currentAdmin?.id && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--ink-muted)' }}>
                      (tú)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--ink-secondary)' }}>
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={updatingId === user._id}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                  >
                    <option value="admin">{ROLE_LABEL.admin}</option>
                    <option value="receptionist">{ROLE_LABEL.receptionist}</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      color: user.active ? 'var(--status-good)' : 'var(--status-critical)',
                      background: user.active ? 'var(--status-good-bg)' : 'var(--status-critical-bg)',
                    }}
                  >
                    {user.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={updatingId === user._id || user._id === currentAdmin?.id}
                    onClick={() => handleToggleActive(user)}
                    className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-40"
                    style={{
                      borderColor: 'var(--border)',
                      color: user.active ? 'var(--status-critical)' : 'var(--status-good)',
                    }}
                  >
                    {user.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <UserModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}
