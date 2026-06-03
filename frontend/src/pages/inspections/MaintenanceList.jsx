import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Plus, Wrench, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { maintenanceAPI } from '../../api/index.js';
import { formatDate, getStatusBadge } from '../../utils/helpers.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MaintenanceList() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    ['maintenance', page],
    () => maintenanceAPI.getAll({ page, limit: 10 }),
    { select: d => d.data.data, keepPreviousData: true }
  );

  const { logs = [], pagination } = data || {};

  const resultIcon = (result) => {
    if (result === 'pass') return <CheckCircle size={14} className="text-green-500" />;
    if (result === 'fail') return <XCircle size={14} className="text-red-500" />;
    return <AlertTriangle size={14} className="text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Logs</h1>
          <p className="text-gray-500 text-sm">{pagination?.total ?? 0} total records</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'inspector') && (
          <Link to="/maintenance/new" className="btn-primary">
            <Plus size={16} /> Log Maintenance
          </Link>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Extinguisher', 'Location', 'Action Taken', 'Date', 'Technician', 'Pressure', 'Result'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Wrench size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400">No maintenance records yet</p>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{log.serial_number}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate">{log.location}</td>
                  <td className="py-3 px-4 text-gray-700 max-w-[200px] truncate">{log.action_taken}</td>
                  <td className="py-3 px-4 text-gray-600">{formatDate(log.action_date)}</td>
                  <td className="py-3 px-4 text-gray-600">{log.technician_name}</td>
                  <td className="py-3 px-4 text-gray-600">{log.pressure_reading ? `${log.pressure_reading} psi` : 'N/A'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {resultIcon(log.result)}
                      <span className={getStatusBadge(log.result)}>{log.result}</span>
                    </div>
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
