import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 30000;

export function NotificationProvider({ children }) {
  const { admin } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const res = await api.get('/admin/notifications');
    setUnreadCount(res.data.unreadCount);
  }, []);

  useEffect(() => {
    if (!admin || admin.role !== 'admin') {
      setUnreadCount(0);
      return;
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [admin, refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
