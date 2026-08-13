import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Appointments from './pages/Appointments';
import Participants from './pages/Participants';
import Campaigns from './pages/Campaigns';
import Logs from './pages/Logs';
import Conversations from './pages/Conversations';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import System from './pages/System';
import PublicRegister from './pages/PublicRegister';

const adminOnly = (element) => <RoleRoute roles={['admin']}>{element}</RoleRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/crear-cuenta" element={<Register />} />
      <Route path="/registro" element={<PublicRegister />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={adminOnly(<Dashboard />)} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="appointments" element={adminOnly(<Appointments />)} />
        <Route path="participants" element={adminOnly(<Participants />)} />
        <Route path="campaigns" element={adminOnly(<Campaigns />)} />
        <Route path="conversations" element={adminOnly(<Conversations />)} />
        <Route path="logs" element={adminOnly(<Logs />)} />
        <Route path="notificaciones" element={adminOnly(<Notifications />)} />
        <Route path="usuarios" element={adminOnly(<Users />)} />
        <Route path="sistema" element={adminOnly(<System />)} />
      </Route>
    </Routes>
  );
}
