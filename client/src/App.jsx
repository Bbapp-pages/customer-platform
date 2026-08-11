import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Appointments from './pages/Appointments';
import Participants from './pages/Participants';
import Campaigns from './pages/Campaigns';
import Logs from './pages/Logs';
import Conversations from './pages/Conversations';
import PublicRegister from './pages/PublicRegister';

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
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="participants" element={<Participants />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}
