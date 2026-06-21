import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquareText, 
  Database, 
  DollarSign, 
  Shield, 
  ArrowLeft
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Prompts', href: '/admin/prompts', icon: MessageSquareText },
  { name: 'Knowledge', href: '/admin/knowledge', icon: Database },
  { name: 'Cost Analytics', href: '/admin/costs', icon: DollarSign },
  { name: 'Audit Logs', href: '/admin/logs', icon: Shield },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 md:min-h-screen flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b border-slate-800">
          <Shield className="w-6 h-6 text-blue-400" />
          <span className="text-lg font-bold">Proxima Admin</span>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <Link
            to="/workspace"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Exit Admin</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
