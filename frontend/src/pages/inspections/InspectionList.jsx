import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, ClipboardCheck, AlertTriangle, XCircle } from 'lucide-react';
import { inspectionsAPI } from '../../api/index.js';
import { formatDateTime, getStatusBadge, getPriorityColor } from '../../utils/helpers.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function InspectionList() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['inspections', page, status],
    () => inspectionsAPI.getAll({ page, limit: 10, status }),
    { select: d => d.data.data, keepPreviousData: true }
  );

  const cancelMutation = useMutation(inspectionsAPI.cancel, {
    onSuccess: () => { toast.success('Inspection cancelled'); queryClient.invalidateQueries('inspections'); },
    onError: () => toast.error('Failed to cancel'),
  });

  const { inspections = [], pagination } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
          <p className="text-gray-500 text-sm">{pagination?.total ?? 0} total records</p>
        </div>
        <Link to="/inspections/new" className="btn-primary">
          <Plus size={16} /> Schedule Inspection
        </Link>
      </div>

      <div className="card py-3">
        <div className="flex flex-wrap gap-2">
          {['', 'scheduled', 'in_progress', 'completed', 'overdue', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === s ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Extinguisher', 'Location', 'Scheduled Date', 'Type', 'Priority', 'Inspector', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <ClipboardCheck size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">No inspections found</p>
                  </td>
                </tr>
              ) : inspections.map(insp => (
                <tr key={insp.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{insp.serial_number}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{insp.location}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDateTime(insp.scheduled_date)}</td>
                  <td className="py-3 px-4 capitalize text-gray-600">{insp.inspection_type}</td>
                  <td className="py-3 px-4">
                    <span className={`capitalize font-medium text-xs ${getPriorityColor(insp.priority)}`}>
                      {insp.priority === 'urgent' && '⚠ '}{insp.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{insp.inspector_name || 'Unassigned'}</td>
                  <td className="py-3 px-4"><span className={getStatusBadge(insp.status)}>{insp.status}</span></td>
                  <td className="py-3 px-4">
                    {user?.role === 'admin' && insp.status === 'scheduled' && (
                      <button onClick={() => cancelMutation.mutate(insp.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                        <XCircle size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {pagination.pages}</p>
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
