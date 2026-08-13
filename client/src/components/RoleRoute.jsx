import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Se usa dentro de un ProtectedRoute ya autenticado, para restringir páginas
// puntuales a ciertos roles. La recepcionista solo tiene Agenda, así que
// cualquier otra página la redirige ahí en vez de mostrar una pantalla vacía.
export default function RoleRoute({ roles, children }) {
  const { admin } = useAuth();

  if (roles && !roles.includes(admin.role)) {
    return <Navigate to="/agenda" replace />;
  }

  return children;
}
