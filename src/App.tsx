import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Scan from '@/pages/Scan';
import Inventory from '@/pages/Inventory';
import CreateItem from '@/pages/CreateItem';
import ItemDetail from '@/pages/ItemDetail';
import QrCodes from '@/pages/QrCodes';
import Activity from '@/pages/Activity';
import Profile from '@/pages/Profile';

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/create" element={<CreateItem />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/qr-codes" element={<QrCodes />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/scan" replace />} />
      </Routes>
    </Layout>
  );
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return session ? <ProtectedRoutes /> : <PublicRoutes />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
