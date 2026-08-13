import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Notifications() {
  const { admin: currentAdmin } = useAuth();
  const { refresh } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/notifications')
      .then((res) => {
        setNotifications(res.data.data);
        return api.post('/admin/notifications/mark-all-read');
      })
      .then(() => refresh())
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Notificaciones
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          Citas creadas o modificadas recientemente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {!loading && notifications.length === 0 && (
          <p className="p-4 text-center text-sm" style={{ color: 'var(--ink-muted)' }}>
            Sin notificaciones.
          </p>
        )}

        {notifications.map((notification) => {
          const isUnread = !notification.readBy.includes(currentAdmin?.id);

          return (
            <div
              key={notification._id}
              className="rounded-lg px-4 py-3"
              style={{
                background: isUnread ? 'var(--accent-bg, rgba(0,0,0,0.04))' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderLeft: isUnread ? '3px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <p className="text-sm" style={{ color: 'var(--ink)' }}>
                {notification.message}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {loading && (
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-muted)' }}>
          Cargando...
        </p>
      )}
    </div>
  );
}
