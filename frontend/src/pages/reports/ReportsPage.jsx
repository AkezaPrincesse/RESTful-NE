import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Download, FileText, Table, RefreshCw, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { reportsAPI } from '../../api/index.js';
import { formatDate, downloadBlob } from '../../utils/helpers.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [period, setPeriod] = useState('all');
  const [exporting, setExporting] = useState('');

  const { data, isLoading, refetch } = useQuery(
    ['reports', period],
    () => reportsAPI.getOverview({ period }),
    { select: d => d.data.data }
  );

  const { data: stockData } = useQuery(
    ['stockReport', period],
    () => reportsAPI.getStock({ period: period === 'all' ? 'monthly' : period }),
    { select: d => d.data.data.stock_trends }
  );

  const handleExport = async (type, format) => {
    setExporting(format);
    try {
      let res;
      if (format === 'pdf') {
        res = await reportsAPI.exportPDF();
        downloadBlob(res.data, `fems-report-${Date.now()}.pdf`);
      } else {
        res = await reportsAPI.exportCSV(type);
        downloadBlob(res.data, `fems-${type}-${Date.now()}.csv`);
      }
      toast.success(`${format.toUpperCase()} exported!`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting('');
    }
  };

  const StatBox = ({ label, value, color = 'text-gray-900', note }) => (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <p className="text-3xl font-bold mt-1 mb-1" style={{ color }}>{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {note && <p className="text-xs text-red-500 mt-1">{note}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm">Real-time fire safety data and export tools</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['daily', 'monthly', 'yearly', 'all'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors ${period === p ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
            ))}
          </div>
          <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-brand" /> Extinguisher Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatBox label="Total" value={data?.extinguishers?.total} />
          <StatBox label="Active" value={data?.extinguishers?.active} color="#22c55e" />
          <StatBox label="Expired" value={data?.extinguishers?.expired} color="#ef4444" note={data?.extinguishers?.expired > 0 ? 'Action required!' : undefined} />
          <StatBox label="Maintenance" value={data?.extinguishers?.under_maintenance} color="#f59e0b" />
          <StatBox label="Expiring (30d)" value={data?.extinguishers?.expiring_soon} color="#f97316" />
          <StatBox label="Inspections Done" value={data?.inspections?.completed} color="#3b82f6" />
          <StatBox label="Overdue" value={data?.inspections?.overdue} color="#ef4444" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock trends */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand" /> Stock Trends
          </h3>
          {stockData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockData.slice(0, 12).reverse()} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_added" name="Added" fill="#c0392b" radius={[3,3,0,0]} />
                <Bar dataKey="active_added" name="Active" fill="#22c55e" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>

        {/* Maintenance stats */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Maintenance Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Logs" value={data?.maintenance?.total} />
            <StatBox label="Passed" value={data?.maintenance?.passed} color="#22c55e" />
            <StatBox label="Failed" value={data?.maintenance?.failed} color="#ef4444" />
            <StatBox label="Total Cost" value={data?.maintenance?.total_cost ? `$${parseFloat(data.maintenance.total_cost).toFixed(2)}` : '$0.00'} color="#6366f1" />
          </div>
        </div>
      </div>

      {/* Expired/Expiring list */}
      {data?.expired_and_expiring?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Expired & Expiring Soon
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {['Serial Number', 'Location', 'Type', 'Status', 'Expiry Date', 'Days Until Expiry'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.expired_and_expiring.slice(0, 10).map(e => (
                  <tr key={e.serial_number} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{e.serial_number}</td>
                    <td className="py-2 px-3 text-gray-600">{e.location}</td>
                    <td className="py-2 px-3 text-gray-600">{e.type}</td>
                    <td className="py-2 px-3 text-gray-600">{e.size}</td>
                    <td className="py-2 px-3 text-red-600 font-medium">{formatDate(e.expiry_date)}</td>
                    <td className="py-2 px-3">
                      <span className={`font-medium ${e.days_until_expiry < 0 ? 'text-red-600' : 'text-orange-500'}`}>
                        {e.days_until_expiry < 0 ? `${Math.abs(e.days_until_expiry)}d overdue` : `${e.days_until_expiry}d left`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export panel */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download size={18} className="text-brand" /> Export Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={() => handleExport('', 'pdf')} disabled={!!exporting} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-all group">
            <FileText size={24} className="text-red-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">All Extinguishers PDF</span>
            {exporting === 'pdf' ? <span className="text-xs text-gray-400">Generating...</span> : <span className="text-xs text-gray-400">Full status report</span>}
          </button>
          <button onClick={() => handleExport('extinguishers', 'csv')} disabled={!!exporting} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-all group">
            <Table size={24} className="text-green-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">Extinguishers CSV</span>
            <span className="text-xs text-gray-400">Stock spreadsheet</span>
          </button>
          <button onClick={() => handleExport('inspections', 'csv')} disabled={!!exporting} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-all group">
            <Table size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">Inspections CSV</span>
            <span className="text-xs text-gray-400">Inspection history</span>
          </button>
          <button onClick={() => handleExport('maintenance', 'csv')} disabled={!!exporting} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand hover:bg-brand/5 transition-all group">
            <Table size={24} className="text-purple-500 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">Maintenance CSV</span>
            <span className="text-xs text-gray-400">Maintenance history</span>
          </button>
        </div>
      </div>
    </div>
  );
}
