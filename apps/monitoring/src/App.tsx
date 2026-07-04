import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { getUser } from './lib/api';
import DashboardPage from './pages/DashboardPage';
import LinesPage from './pages/LinesPage';
import LoginPage from './pages/LoginPage';
import PlantHealthPage from './pages/PlantHealthPage';
import RegionDetailPage from './pages/RegionDetailPage';
import RegionsPage from './pages/RegionsPage';
import ReportsPage from './pages/ReportsPage';
import SummaryPage from './pages/SummaryPage';
import WaterSavingsPage from './pages/WaterSavingsPage';

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
        <Route path="summary" element={<SummaryPage />} />
        <Route path="regions" element={<RegionsPage />} />
        <Route path="regions/:id" element={<RegionDetailPage />} />
        <Route path="lines" element={<LinesPage />} />
        <Route path="water-savings" element={<WaterSavingsPage />} />
        <Route path="plant-health" element={<PlantHealthPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
