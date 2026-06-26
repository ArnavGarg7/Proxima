import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Landing from '@/pages/Landing';
import Workspace from '@/pages/Workspace';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthCallback from '@/components/AuthCallback';
import Dashboard from '@/pages/Dashboard';
import Templates from '@/pages/Templates';
import Analyze from '@/pages/Analyze';
import Audit from '@/pages/Audit';
import Compare from '@/pages/Compare';
import CodeSuite from '@/pages/CodeSuite';
import DomainRadar from '@/pages/DomainRadar';
import Clinical from '@/pages/Clinical';
import Legal from '@/pages/Legal';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/components/AdminLayout';
import Unauthorized from '@/pages/Unauthorized';
import AdminOverview from '@/pages/admin/Overview';
import CostAnalytics from '@/pages/admin/CostAnalytics';
import UsersConsole from '@/pages/admin/Users';
import PromptsConsole from '@/pages/admin/Prompts';
import KnowledgeConsole from '@/pages/admin/Knowledge';
import AuditLogsConsole from '@/pages/admin/AuditLogs';

function AppContent() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    hydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isAuthenticated && !isAdminRoute && <Navbar />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={!isAuthenticated ? <Landing /> : <Navigate to="/workspace" />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
            <Route element={<ProtectedRoute />}>
              <Route path="/workspace" element={<Workspace />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/clinical" element={<Clinical />} />
              <Route path="/code" element={<CodeSuite />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/radar" element={<DomainRadar />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/users" element={<UsersConsole />} />
              <Route path="/admin/prompts" element={<PromptsConsole />} />
              <Route path="/admin/knowledge" element={<KnowledgeConsole />} />
              <Route path="/admin/costs" element={<CostAnalytics />} />
              <Route path="/admin/logs" element={<AuditLogsConsole />} />
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
