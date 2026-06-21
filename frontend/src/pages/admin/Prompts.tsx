import { useState } from 'react';
import { useAdminPrompts, useCreatePrompt, useActivatePrompt } from '@/hooks/useAdminPrompts';
import { RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { AdminPrompt } from '@/lib/adminApi';

export default function PromptsConsole() {
  const { data, isLoading, isError, refetch } = useAdminPrompts();
  const createPrompt = useCreatePrompt();
  const activatePrompt = useActivatePrompt();

  const [activateConfirm, setActivateConfirm] = useState<AdminPrompt | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ prompt_key: '', content: '', is_active: false });

  const handleActivateConfirm = () => {
    if (activateConfirm) {
      activatePrompt.mutate(activateConfirm.version_id, {
        onSuccess: () => setActivateConfirm(null)
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPrompt.mutate(newPrompt, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewPrompt({ prompt_key: '', content: '', is_active: false });
      }
    });
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load prompts</h3>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Prompt Library</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Version
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <th className="px-6 py-3 font-medium">Prompt Key</th>
                <th className="px-6 py-3 font-medium">Version</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created Date</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((prompt) => (
                <tr key={prompt.version_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{prompt.prompt_key}</td>
                  <td className="px-6 py-4 text-gray-600">v{prompt.version}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${prompt.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                      {prompt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(prompt.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!prompt.is_active && (
                      <button
                        onClick={() => setActivateConfirm(prompt)}
                        disabled={activatePrompt.isPending}
                        className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-200 rounded-md bg-blue-50"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No prompts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {activateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Activate Prompt Version</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to activate <strong>{activateConfirm.prompt_key}</strong> (v{activateConfirm.version})? This will deactivate the currently active version for this key.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActivateConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold mb-4">Create New Prompt Version</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Key</label>
                <input
                  required
                  type="text"
                  value={newPrompt.prompt_key}
                  onChange={(e) => setNewPrompt({ ...newPrompt, prompt_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. system_prompt_v1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  required
                  rows={6}
                  value={newPrompt.content}
                  onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="You are an AI assistant..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newPrompt.is_active}
                  onChange={(e) => setNewPrompt({ ...newPrompt, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Set as active version</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPrompt.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {createPrompt.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Create Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
