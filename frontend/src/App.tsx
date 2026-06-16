import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import Navbar from '@/components/Navbar';
import Landing from '@/pages/Landing';
import Workspace from '@/pages/Workspace';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthCallback from '@/components/AuthCallback';
import StubPage from '@/components/StubPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {isAuthenticated && <Navbar />}
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={!isAuthenticated ? <Landing /> : <Navigate to="/workspace" />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
