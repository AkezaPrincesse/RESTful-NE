import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ArrowLeft, Edit, ClipboardCheck, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { extinguishersAPI } from '../../api/index.js';
import { formatDate, getStatusBadge, isExpired } from '../../utils/helpers.js';
import { useAuth } from '../../context/AuthContext.jsx';

const InfoRow = ({ label, value, highlight }) => (
  <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-sm font-medium ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value || 'N/A'}</span>
  </div>
);

export default function ExtinguisherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery(
    ['extinguisher', id],
    () => extinguishersAPI.getById(id),
    { select: d => d.data.data }
  );

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" /></div>;
  }

  if (!data) return <div className="text-center py-20 text-gray-400">Extinguisher not found</div>;

  const { extinguisher: ext, recent_inspections, recent_maintenance } = data;
  const expired = isExpired(ext.expiry_date);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {ext.serial_number}
            <span className={getStatusBadge(ext.status)}>{ext.status}</span>
            {expired && <span className="badge-expired flex items-center gap-1"><AlertTriangle size={12} />Expired</span>}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{ext.location}</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'inspector') && (
          <Link to={`/extinguishers/${id}/edit`} className="btn-primary">
            <Edit size={16} /> Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Extinguisher Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <InfoRow label="Type" value={ext.type} />
                <InfoRow label="Size" value={ext.size} />
                <InfoRow label="Manufacturer" value={ext.manufacturer} />
                <InfoRow label="Model" value={ext.model} />
              </div>
              <div>
                <InfoRow label="Installation Date" value={formatDate(ext.installation_date)} />
                <InfoRow label="Expiry Date" value={formatDate(ext.expiry_date)} highlight={expired} />
                <InfoRow label="Last Inspection" value={formatDate(ext.last_inspection_date)} />
                <InfoRow label="Next Inspection" value={formatDate(ext.next_inspection_date)} highlight={ext.inspection_overdue} />
              </div>
            </div>
            {ext.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700">{ext.notes}</p>
              </div>
            )}
          </div>

          {/* Recent Inspections */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-brand" /> Recent Inspections
              </h3>
              <Link to={`/inspections/new`} state={{ extinguisher_id: id }} className="text-sm text-brand hover:underline">
                Schedule
              </Link>
            </div>
            {recent_inspections?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs text-gray-500">Date</th>
                    <th className="text-left py-2 text-xs text-gray-500">Type</th>
                    <th className="text-left py-2 text-xs text-gray-500">Inspector</th>
                    <th className="text-left py-2 text-xs text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_inspections.map(i => (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-600">{formatDate(i.scheduled_date)}</td>
                      <td className="py-2 capitalize text-gray-600">{i.inspection_type}</td>
                      <td className="py-2 text-gray-600">{i.inspector_name || 'Unassigned'}</td>
                      <td className="py-2"><span className={getStatusBadge(i.status)}>{i.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-gray-400 text-sm py-4 text-center">No inspection records</p>}
          </div>

          {/* Recent Maintenance */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wrench size={18} className="text-brand" /> Recent Maintenance
              </h3>
              {(user?.role === 'admin' || user?.role === 'inspector') && (
                <Link to={`/maintenance/new`} state={{ extinguisher_id: id }} className="text-sm text-brand hover:underline">
                  Log Activity
                </Link>
              )}
            </div>
            {recent_maintenance?.length > 0 ? (
              <div className="space-y-3">
                {recent_maintenance.map(m => (
                  <div key={m.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-brand">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.action_taken}</p>
                        <p className="text-xs text-gray-500 mt-1">By {m.technician_name} • {formatDate(m.action_date)}</p>
                      </div>
                      <span className={getStatusBadge(m.result)}>{m.result}</span>
                    </div>
                    {m.conditions_noted && <p className="text-xs text-gray-600 mt-2">{m.conditions_noted}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm py-4 text-center">No maintenance records</p>}
          </div>
        </div>

        {/* Side stats */}
        <div className="space-y-4">
          <div className="card text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${expired ? 'bg-red-100' : 'bg-green-100'}`}>
              {expired ? <AlertTriangle size={28} className="text-red-500" /> : <CheckCircle size={28} className="text-green-500" />}
            </div>
            <p className="font-bold text-gray-900">{expired ? 'Expired' : 'Valid'}</p>
            <p className="text-xs text-gray-500 mt-1">Expires: {formatDate(ext.expiry_date)}</p>
          </div>

          <div className="card">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Inspections</span>
                <span className="font-medium">{recent_inspections?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Maintenance Logs</span>
                <span className="font-medium">{recent_maintenance?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registered By</span>
                <span className="font-medium text-xs">{ext.registered_by_name || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Actions</h4>
            <div className="space-y-2">
              <Link to={`/inspections/new`} state={{ extinguisher_id: id }} className="btn-primary w-full justify-center text-sm py-2">
                <ClipboardCheck size={15} /> Schedule Inspection
              </Link>
              {(user?.role === 'admin' || user?.role === 'inspector') && (
                <Link to={`/maintenance/new`} state={{ extinguisher_id: id }} className="btn-secondary w-full justify-center text-sm py-2">
                  <Wrench size={15} /> Log Maintenance
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
