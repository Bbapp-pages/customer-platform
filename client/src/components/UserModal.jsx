import { useState } from 'react';
import api from '../api/client';

const inputStyle = {
  borderColor: 'var(--border)',
  color: 'var(--ink)',
  background: 'var(--surface)',
};

export default function UserModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('receptionist');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/admin/users', { name, email, password, role });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el usuario');
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
        className="w-full max-w-md rounded-xl border p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Nuevo usuario
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

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Contraseña
        </label>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
          placeholder="Mínimo 8 caracteres"
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Rol
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm"
          style={inputStyle}
        >
          <option value="receptionist">Recepcionista (solo ver + modificar citas)</option>
          <option value="admin">Admin (acceso total)</option>
        </select>

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
            {submitting ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}
