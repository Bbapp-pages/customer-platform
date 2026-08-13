import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const NAV_ITEMS = [
  { to: '/', label: 'Resumen', roles: ['admin'] },
  { to: '/agenda', label: 'Agenda', roles: ['admin', 'receptionist'] },
  { to: '/appointments', label: 'Citas', roles: ['admin'] },
  { to: '/participants', label: 'Participantes', roles: ['admin'] },
  { to: '/campaigns', label: 'Campañas', roles: ['admin'] },
  { to: '/conversations', label: 'Conversaciones', roles: ['admin'] },
  { to: '/logs', label: 'Actividad', roles: ['admin'] },
  { to: '/notificaciones', label: 'Notificaciones', roles: ['admin'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['admin'] },
  { to: '/sistema', label: 'Sistema', roles: ['admin'] },
];

export const ROLE_LABEL = { admin: 'Admin', receptionist: 'Recepcionista' };

export default function Layout() {
  const { admin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(admin?.role));

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
          {visibleNavItems.map((item) => (
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
              <span className="flex items-center justify-between gap-2">
                {item.label}
                {item.to === '/notificaciones' && unreadCount > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ color: 'var(--status-critical)', background: 'var(--status-critical-bg)' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {admin?.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
            {admin?.email}
          </p>
          <p className="mb-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {ROLE_LABEL[admin?.role] || admin?.role}
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
