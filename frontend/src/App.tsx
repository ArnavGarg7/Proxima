import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { InteractionProvider } from '@/components/interaction/InteractionProvider';
import Navbar from '@/components/Navbar';
import { AppSidebar } from '@/components/AppSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthCallback from '@/components/AuthCallback';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/components/AdminLayout';
import Unauthorized from '@/pages/Unauthorized';

/* ── Lazy-loaded pages ──────────────────────────────────────────────────────── */
const Landing     = lazy(() => import('@/pages/Landing'));
const Workspace   = lazy(() => import('@/pages/Workspace'));
const Dashboard   = lazy(() => import('@/pages/Dashboard'));
const Templates   = lazy(() => import('@/pages/Templates'));
const Analyze     = lazy(() => import('@/pages/Analyze'));
const Audit       = lazy(() => import('@/pages/Audit'));
const Compare     = lazy(() => import('@/pages/Compare'));
const CodeSuite   = lazy(() => import('@/pages/CodeSuite'));
const DomainRadar = lazy(() => import('@/pages/DomainRadar'));
const Clinical    = lazy(() => import('@/pages/Clinical'));
const Legal       = lazy(() => import('@/pages/Legal'));

const AdminOverview    = lazy(() => import('@/pages/admin/Overview'));
const CostAnalytics    = lazy(() => import('@/pages/admin/CostAnalytics'));
const UsersConsole     = lazy(() => import('@/pages/admin/Users'));
const PromptsConsole   = lazy(() => import('@/pages/admin/Prompts'));
const KnowledgeConsole = lazy(() => import('@/pages/admin/Knowledge'));
const AuditLogsConsole = lazy(() => import('@/pages/admin/AuditLogs'));

const PageFallback = (
  <div className="flex h-screen items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppContent() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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

  const routes = (
    <Suspense fallback={PageFallback}>
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
    </Suspense>
  );

  // Authenticated app pages: sidebar + slim header layout
  if (isAuthenticated && !isAdminRoute) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <Navbar
          onMenuClick={() => setDrawerOpen((o) => !o)}
          isDrawerOpen={drawerOpen}
        />
        <div className="flex flex-1 min-h-0">
          <AppSidebar isDrawerOpen={drawerOpen} onClose={closeDrawer} />
          <main className="flex flex-col flex-1 min-w-0 overflow-y-auto">
            {routes}
          </main>
        </div>
      </div>
    );
  }

  // Landing, auth callback, admin routes: full-page layout with no sidebar
  return (
    <div className="min-h-screen flex flex-col">
      {routes}
    </div>
  );
}

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <Router>
        <InteractionProvider>
          <AppContent />
        </InteractionProvider>
      </Router>
    </LazyMotion>
  );
}

export default App;
