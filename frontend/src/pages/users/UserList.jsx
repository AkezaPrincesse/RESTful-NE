import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Search, UserX, UserCheck, Shield } from 'lucide-react';
import { usersAPI } from '../../api/index.js';
import { formatDate } from '../../utils/helpers.js';
import toast from 'react-hot-toast';

const roleBadge = (role) => {
  const map = { admin: 'bg-red-100 text-red-700', inspector: 'bg-blue-100 text-blue-700', user: 'bg-gray-100 text-gray-700' };
  return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[role] || map.user}`;
};

export default function UserList() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['users', page, search, role],
    () => usersAPI.getAll({ page, limit: 10, search, role }),
    { select: d => d.data.data, keepPreviousData: true }
  );

  const toggleMutation = useMutation(
    ({ id, is_active }) => usersAPI.update(id, { is_active }),
    {
      onSuccess: () => { toast.success('User status updated'); queryClient.invalidateQueries('users'); },
      onError: () => toast.error('Failed to update user'),
    }
  );

  const { users = [], pagination } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm">{pagination?.total ?? 0} registered users</p>
      </div>

      <div className="card py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="input-field pl-9" />
          </div>
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="input-field sm:w-40">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="inspector">Inspector</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Email', 'Role', 'Department', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                        {u.first_name[0]}{u.last_name[0]}
                      </div>
                      <span className="font-medium text-gray-900">{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={roleBadge(u.role)}>
                      <Shield size={10} />{u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{u.department || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{u.phone || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(u.created_at)}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleMutation.mutate({ id: u.id, is_active: !u.is_active })}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                    >
                      {u.is_active ? <><UserX size={12} />Deactivate</> : <><UserCheck size={12} />Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {pagination.pages} · {pagination.total} users</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
