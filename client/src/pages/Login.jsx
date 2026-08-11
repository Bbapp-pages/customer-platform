import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 'No se pudo iniciar sesión'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'var(--page)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border p-8"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--ink)' }}
        >
          Panel de administración
        </h1>
        <p className="mt-1 mb-6 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Ingresa tus credenciales para continuar.
        </p>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Correo
        </label>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          placeholder="admin@example.com"
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          placeholder="••••••••"
        />

        {error && (
          <p
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{
              color: 'var(--status-critical)',
              background: 'var(--status-critical-bg)',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: 'var(--accent)' }}
        >
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="mt-4 text-center text-sm" style={{ color: 'var(--ink-secondary)' }}>
          ¿Necesitas una cuenta?{' '}
          <Link to="/crear-cuenta" style={{ color: 'var(--accent)' }}>
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  );
}
