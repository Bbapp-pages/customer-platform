import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Resumen' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/appointments', label: 'Citas' },
  { to: '/participants', label: 'Participantes' },
  { to: '/campaigns', label: 'Campañas' },
];

export default function Layout() {
  const { admin, logout } = useAuth();

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--page)' }}>
      <aside
        className="hidden w-60 shrink-0 flex-col border-r p-5 sm:flex"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
          Admin
        </p>
        <p className="mb-6 text-xs" style={{ color: 'var(--ink-muted)' }}>
          WhatsApp AI Backend
        </p>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : ''
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--ink-secondary)',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {admin?.name}
          </p>
          <p className="mb-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
            {admin?.email}
          </p>
          <button
            onClick={logout}
            className="w-full rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-secondary)' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
