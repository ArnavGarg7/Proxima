import { useState } from 'react';
import { useAdminLogs } from '@/hooks/useAdminLogs';
import { RefreshCw, AlertCircle, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLogsConsole() {
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const { data, isLoading, isError, refetch, isRefetching } = useAdminLogs(skip, limit);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load audit logs</h3>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Admin ID</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Target Resource</th>
                  <th className="px-6 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((log) => (
                  <tr key={log.log_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600 truncate max-w-[120px]" title={log.admin_user_id}>
                      {log.admin_user_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{log.action}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.target_resource}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">
                      {log.ip_address}
                    </td>
                  </tr>
                ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {data && data.total > limit && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Showing {skip + 1} to {Math.min(skip + limit, data.total)} of {data.total} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    disabled={skip === 0}
                    className="p-1 border border-gray-300 rounded text-gray-600 hover:bg-white disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSkip(skip + limit)}
                    disabled={skip + limit >= data.total}
                    className="p-1 border border-gray-300 rounded text-gray-600 hover:bg-white disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
