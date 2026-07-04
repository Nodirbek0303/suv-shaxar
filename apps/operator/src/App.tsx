import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { getUser } from './lib/api';
import AlertsPage from './pages/AlertsPage';
import DashboardPage from './pages/DashboardPage';
import LinesPage from './pages/LinesPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import ProgramsPage from './pages/ProgramsPage';
import ReportsPage from './pages/ReportsPage';
import SensorsPage from './pages/SensorsPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="lines" element={<LinesPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="sensors" element={<SensorsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
