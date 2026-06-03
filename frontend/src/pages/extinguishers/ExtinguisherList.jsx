import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Eye, Edit, Trash2, Filter, Download, Flame, AlertTriangle } from 'lucide-react';
import { extinguishersAPI } from '../../api/index.js';
import { formatDate, getStatusBadge, isExpired, isExpiringSoon } from '../../utils/helpers.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function ExtinguisherList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['extinguishers', page, search, status, type],
    () => extinguishersAPI.getAll({ page, limit: 10, search, status, type }),
    { select: d => d.data.data, keepPreviousData: true }
  );

  const deleteMutation = useMutation(extinguishersAPI.delete, {
    onSuccess: () => {
      toast.success('Extinguisher removed');
      queryClient.invalidateQueries('extinguishers');
      queryClient.invalidateQueries('extStats');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const handleDelete = (id, serial) => {
    if (window.confirm(`Remove extinguisher ${serial}? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const { extinguishers = [], pagination } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fire Extinguishers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination?.total ?? 0} total records
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'inspector') && (
          <Link to="/extinguishers/new" className="btn-primary">
            <Plus size={16} /> Register New
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by serial number, location..."
              className="input-field pl-9"
            />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field sm:w-48">
            <option value="">All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Expired</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option>Decommissioned</option>
          </select>
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="input-field sm:w-48">
            <option value="">All Types</option>
            <option>Water</option>
            <option>CO2</option>
            <option>Foam</option>
            <option value="Dry Chemical">Dry Chemical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Serial Number', 'Location', 'Type', 'Size', 'Status', 'Expiry Date', 'Next Inspection', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : extinguishers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Flame size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">No extinguishers found</p>
                  </td>
                </tr>
              ) : extinguishers.map(ext => (
                <tr key={ext.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {(ext.is_expired || isExpired(ext.expiry_date)) && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900">{ext.serial_number}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 max-w-[180px] truncate">{ext.location}</td>
                  <td className="py-3 px-4 text-gray-600">{ext.type}</td>
                  <td className="py-3 px-4 text-gray-600">{ext.size}</td>
                  <td className="py-3 px-4">
                    <span className={getStatusBadge(ext.status)}>{ext.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={isExpired(ext.expiry_date) ? 'text-red-600 font-medium' : isExpiringSoon(ext.expiry_date) ? 'text-orange-500 font-medium' : 'text-gray-600'}>
                      {formatDate(ext.expiry_date)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={ext.inspection_overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {formatDate(ext.next_inspection_date)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Link to={`/extinguishers/${ext.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye size={15} />
                      </Link>
                      {(user?.role === 'admin' || user?.role === 'inspector') && (
                        <Link to={`/extinguishers/${ext.id}/edit`} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <Edit size={15} />
                        </Link>
                      )}
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDelete(ext.id, ext.serial_number)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${page === p ? 'bg-brand text-white border-brand' : 'border-gray-200 hover:bg-gray-50'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
