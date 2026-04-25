import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Medias from './pages/Medias';
import Playlists from './pages/Playlists';
import Devices from './pages/Devices';
import Clients from './pages/Clients';
import Schedules from './pages/Schedules';
import Logs from './pages/Logs';
import Player from './pages/Player';
import Users from './pages/Users';
import PlaylistEditor from './pages/PlaylistEditor';
import DeviceEditor from './pages/DeviceEditor';
import ClientEditor from './pages/ClientEditor';
import ScheduleEditor from './pages/ScheduleEditor';
import UserEditor from './pages/UserEditor';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  return user?.role === 'client' ? <Navigate to="/player" /> : <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/player" element={<PrivateRoute><Player /></PrivateRoute>} />

            {/* Protected layout routes */}
            <Route path="/" element={<PrivateRoute><Layout title="Dashboard" /></PrivateRoute>}>
              <Route index element={<RoleRedirect />} />
            </Route>

            <Route path="/medias" element={<PrivateRoute><Layout title="Mídias" /></PrivateRoute>}>
              <Route index element={<Medias />} />
            </Route>

            <Route path="/playlists" element={<PrivateRoute><Layout title="Planos de Exibição" /></PrivateRoute>}>
              <Route index element={<Playlists />} />
              <Route path="new" element={<PlaylistEditor />} />
              <Route path=":id" element={<PlaylistEditor />} />
            </Route>

            <Route path="/devices" element={<PrivateRoute><Layout title="Dispositivos" /></PrivateRoute>}>
              <Route index element={<Devices />} />
              <Route path="new" element={<DeviceEditor />} />
              <Route path=":id" element={<DeviceEditor />} />
            </Route>

            <Route path="/clients" element={<PrivateRoute adminOnly><Layout title="Clientes" /></PrivateRoute>}>
              <Route index element={<Clients />} />
              <Route path="new" element={<ClientEditor />} />
              <Route path=":id" element={<ClientEditor />} />
            </Route>

            <Route path="/users" element={<PrivateRoute adminOnly><Layout title="Usuários" /></PrivateRoute>}>
              <Route index element={<Users />} />
              <Route path="new" element={<UserEditor />} />
              <Route path=":id" element={<UserEditor />} />
            </Route>

            <Route path="/schedules" element={<PrivateRoute><Layout title="Agendamentos" /></PrivateRoute>}>
              <Route index element={<Schedules />} />
              <Route path="new" element={<ScheduleEditor />} />
              <Route path=":id" element={<ScheduleEditor />} />
            </Route>

            <Route path="/logs" element={<PrivateRoute><Layout title="Logs de Atividade" /></PrivateRoute>}>
              <Route index element={<Logs />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
