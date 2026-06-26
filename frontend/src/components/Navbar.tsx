import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <header className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <Link to="/workspace" className="font-display text-gold-primary text-xl font-semibold">Proxima</Link>
        <nav className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Dashboard</Link>
          <Link to="/workspace" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Workspace</Link>
          <Link to="/templates" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Templates</Link>
          <Link to="/analyze" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Analyze</Link>
          <Link to="/legal" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Legal</Link>
          <Link to="/clinical" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Clinical</Link>
          <Link to="/compare" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Compare</Link>
          <Link to="/audit" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Audit</Link>
          <Link to="/code" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Code Suite</Link>
          <Link to="/radar" className="text-text-secondary hover:text-text-primary text-sm transition-colors">Domain Radar</Link>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        {user?.role === 'admin' && (
          <Link to="/admin" className="text-xs bg-red-900/30 text-red-400 px-3 py-1.5 rounded border border-red-900 hover:bg-red-900/50 transition-colors font-medium">
            Admin Dashboard
          </Link>
        )}
        <span className="text-sm text-text-muted">{user?.email}</span>
        <button onClick={logout} className="btn-ghost text-sm">Sign Out</button>
      </div>
    </header>
  );
}
