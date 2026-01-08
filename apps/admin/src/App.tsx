import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import UsersList from './pages/users/UsersList';
import TherapistsList from './pages/therapists/TherapistsList';
import AppointmentsList from './pages/appointments/AppointmentsList';
import PaymentsList from './pages/payments/PaymentsList';
import Settings from './pages/settings/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<UsersList />} />
                <Route path="/therapists" element={<TherapistsList />} />
                <Route path="/appointments" element={<AppointmentsList />} />
                <Route path="/payments" element={<PaymentsList />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
