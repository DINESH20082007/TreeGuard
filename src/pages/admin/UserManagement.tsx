import { useState, useEffect } from 'react';
import { adminApi, UserManagementItem } from '../../services/admin';

export default function UserManagement() {
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'citizen' | 'inspector' | 'admin'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers();
      setUsers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load organization users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserManagementItem) => {
    setActionLoadingId(user.id);
    try {
      const updated = await adminApi.updateUserStatus(user.id, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update user status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.primary_district && u.primary_district.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  const citizenCount = users.filter((u) => u.role === 'citizen').length;
  const inspectorCount = users.filter((u) => u.role === 'inspector').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">User Management</h1>
          <p className="text-gray-500 text-sm">Manage system accounts, access levels, and field team role authorizations</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition cursor-pointer"
        >
          🔄 Refresh Directory
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
          <p className="text-xs text-forest-600 mt-1">Active platform directory</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Citizens</p>
          <p className="text-2xl font-bold text-forest-800 mt-1">{citizenCount}</p>
          <p className="text-xs text-gray-500 mt-1">Community reporters</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Field Inspectors</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{inspectorCount}</p>
          <p className="text-xs text-gray-500 mt-1">Arborist operations</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admins</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{adminCount}</p>
          <p className="text-xs text-gray-500 mt-1">Municipal leadership</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or district..."
            className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(['all', 'citizen', 'inspector', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition cursor-pointer ${
                roleFilter === r ? 'bg-forest-800 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r === 'all' ? 'All Roles' : r === 'citizen' ? 'Citizens' : r === 'inspector' ? 'Inspectors' : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-gray-400 text-sm animate-pulse">Loading organization users...</div>
        )}
        {error && (
          <div className="p-6 text-center text-red-600 text-sm bg-red-50 border-b border-red-100">{error}</div>
        )}
        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500 text-sm">
            No users match the specified search or role criteria.
          </div>
        )}
        {!loading && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">District</th>
                  <th className="py-3.5 px-4">Workload</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const roleBadge =
                    u.role === 'admin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : u.role === 'inspector'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-forest-50 text-forest-700 border-forest-200';

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-forest-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{u.full_name}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${roleBadge}`}>
                          {u.role === 'inspector' ? 'Field Inspector' : u.role === 'admin' ? 'Org Admin' : 'Citizen'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">{u.primary_district || 'RS Puram, Coimbatore'}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {u.role === 'inspector'
                          ? `${u.assigned_count} assignments`
                          : `${u.reports_count} submissions`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleToggleStatus(u)}
                          className="text-xs font-semibold text-forest-700 hover:text-forest-900 px-2.5 py-1 rounded hover:bg-forest-50 transition cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === u.id
                            ? 'Updating…'
                            : u.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
