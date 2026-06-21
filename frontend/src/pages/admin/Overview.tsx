import { 
  Users, 
  UserCheck, 
  Activity, 
  Coins, 
  DollarSign, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';

export default function AdminOverview() {
  const { data, isLoading, isError, refetch, isRefetching } = useAdminAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-lg text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load analytics</h3>
        <p className="text-red-600 mb-4">There was a problem fetching the dashboard metrics.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const metrics = [
    { label: 'Total Users', value: data.total_users.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Users', value: data.active_users.toLocaleString(), icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Total Requests', value: data.total_requests.toLocaleString(), icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Total Tokens', value: data.total_tokens.toLocaleString(), icon: Coins, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Total Cost', value: `$${data.total_cost.toFixed(2)}`, icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`p-3 rounded-lg ${metric.bg}`}>
                <Icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 mt-8">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p>The system is operating normally.</p>
      </div>
    </div>
  );
}
