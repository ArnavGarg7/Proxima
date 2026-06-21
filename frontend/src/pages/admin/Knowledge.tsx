import { useState } from 'react';
import { useAdminKnowledge, useSyncKnowledge } from '@/hooks/useAdminKnowledge';
import { RefreshCw, AlertCircle, Database } from 'lucide-react';

export default function KnowledgeConsole() {
  const { data, isLoading, isError, refetch } = useAdminKnowledge();
  const syncKnowledge = useSyncKnowledge();

  const [syncConfirm, setSyncConfirm] = useState<string | null>(null);

  const handleSyncConfirm = () => {
    if (syncConfirm) {
      syncKnowledge.mutate({ kbName: syncConfirm, forceReindex: true }, {
        onSuccess: () => setSyncConfirm(null)
      });
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load Domain Knowledge Records</h3>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Console</h1>
        <button
          onClick={() => setSyncConfirm('default')}
          disabled={syncKnowledge.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          Sync All Sources
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <th className="px-6 py-3 font-medium">Knowledge Base</th>
                <th className="px-6 py-3 font-medium">Source Document</th>
                <th className="px-6 py-3 font-medium">Chunk Title</th>
                <th className="px-6 py-3 font-medium">Tokens</th>
                <th className="px-6 py-3 font-medium">Added On</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((chunk) => (
                <tr key={chunk.chunk_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{chunk.kb_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[200px]" title={chunk.source}>{chunk.source}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{chunk.title || `Chunk #${chunk.chunk_index}`}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{chunk.token_count}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(chunk.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSyncConfirm(chunk.kb_name)}
                      disabled={syncKnowledge.isPending}
                      className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded-md bg-gray-50"
                    >
                      Sync Source
                    </button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No Knowledge Chunks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {syncConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Confirm Knowledge Sync</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to force re-index the <strong>{syncConfirm}</strong> knowledge base? This action may take some time depending on the size of the Knowledge Sources.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSyncConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncConfirm}
                disabled={syncKnowledge.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {syncKnowledge.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                Confirm Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
