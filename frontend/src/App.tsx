import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import Navbar from '@/components/Navbar';
import Landing from '@/pages/Landing';
import Workspace from '@/pages/Workspace';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthCallback from '@/components/AuthCallback';
import StubPage from '@/components/StubPage';
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
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

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
            <Route path="/analyze" element={<StubPage title="Contract Analyzer" />} />
            <Route path="/clinical" element={<StubPage title="Clinical Notes" />} />
            <Route path="/code" element={<StubPage title="Code Suite" />} />
            <Route path="/compare" element={<StubPage title="Document Compare" />} />
            <Route path="/templates" element={<StubPage title="Template Library" />} />
            <Route path="/audit" element={<StubPage title="Confidence Audit" />} />
            <Route path="/radar" element={<StubPage title="Domain Radar" />} />
            <Route path="/dashboard" element={<StubPage title="Dashboard" />} />
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
