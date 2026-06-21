import { useState } from 'react';
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from '@/hooks/useAdminUsers';
import { RefreshCw, AlertCircle, Search } from 'lucide-react';
import { AdminUser } from '@/lib/adminApi';

export default function UsersConsole() {
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const limit = 50;

  const { data, isLoading, isError, refetch } = useAdminUsers(skip, limit, search);
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();

  const [deactivateConfirm, setDeactivateConfirm] = useState<{ user: AdminUser | null; active: boolean }>({ user: null, active: false });

  const handleRoleChange = (userId: string, role: string) => {
    updateRole.mutate({ userId, role });
  };

  const confirmStatusChange = () => {
    if (deactivateConfirm.user) {
      updateStatus.mutate({ userId: deactivateConfirm.user.user_id, isActive: deactivateConfirm.active });
      setDeactivateConfirm({ user: null, active: false });
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load users</h3>
        <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((user) => (
                <tr key={user.user_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                      disabled={updateRole.isPending}
                      className="text-sm border-gray-300 rounded-md bg-white px-2 py-1 outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{user.plan}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeactivateConfirm({ user, active: !user.is_active })}
                      disabled={updateStatus.isPending}
                      className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded-md ml-2"
                    >
                      {user.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {deactivateConfirm.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {deactivateConfirm.active ? 'Reactivate User' : 'Deactivate User'}
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {deactivateConfirm.active ? 'reactivate' : 'deactivate'} <strong>{deactivateConfirm.user.email}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeactivateConfirm({ user: null, active: false })}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
