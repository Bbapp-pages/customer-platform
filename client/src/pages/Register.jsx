import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register(name, email, password, code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 'No se pudo crear la cuenta'
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
        <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
          Crear cuenta
        </h1>
        <p className="mt-1 mb-6 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Necesitas el código de acceso que te dieron — el tipo de cuenta se asigna según el código.
        </p>

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Nombre
        </label>
        <input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          placeholder="Tu nombre"
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Correo
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          placeholder="tu@correo.com"
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Contraseña
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          placeholder="Mínimo 8 caracteres"
        />

        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Código de acceso
        </label>
        <input
          required
          inputMode="numeric"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm tracking-widest outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
          placeholder="Código de 8 dígitos"
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
          {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p className="mt-4 text-center text-sm" style={{ color: 'var(--ink-secondary)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
