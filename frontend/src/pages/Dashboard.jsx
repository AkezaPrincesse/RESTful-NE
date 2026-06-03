import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Flame, CheckCircle, AlertTriangle, Wrench, Clock, TrendingUp,
  Plus, ChevronRight, Activity
} from 'lucide-react';
import { extinguishersAPI, inspectionsAPI } from '../api/index.js';
import { formatDate, getStatusBadge } from '../utils/helpers.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6'];

const StatCard = ({ icon: Icon, label, value, color, sub, link }) => (
  <Link to={link || '#'} className="card hover:shadow-md transition-shadow group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  </Link>
);

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery('extStats', () => extinguishersAPI.getStats(), {
    select: d => d.data.data,
  });

  const { data: inspData } = useQuery('inspections', () => inspectionsAPI.getAll({ limit: 5, status: 'scheduled' }), {
    select: d => d.data.data,
  });

  const pieData = stats?.by_type?.map((t, i) => ({
    name: t.type,
    value: parseInt(t.count),
    color: COLORS[i % COLORS.length],
  })) || [];

  const statusBar = stats?.by_status?.map(s => ({
    name: s.status,
    count: parseInt(s.count),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.first_name}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your fire safety equipment.</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'inspector') && (
          <Link to="/extinguishers/new" className="btn-primary hidden sm:flex">
            <Plus size={16} /> Register Extinguisher
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame}         label="Total Extinguishers" value={stats?.summary?.total}           color="bg-brand"       link="/extinguishers" />
        <StatCard icon={CheckCircle}   label="Active"              value={stats?.summary?.active}          color="bg-green-500"   link="/extinguishers?status=Active" sub="Currently operational" />
        <StatCard icon={AlertTriangle} label="Expired"             value={stats?.summary?.expired}         color="bg-red-500"     link="/extinguishers?status=Expired" sub="Needs replacement" />
        <StatCard icon={Wrench}        label="Under Maintenance"   value={stats?.summary?.under_maintenance} color="bg-yellow-500" link="/extinguishers?status=Under+Maintenance" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}        label="Inspections Overdue" value={stats?.summary?.inspection_overdue} color="bg-orange-500" link="/inspections" />
        <StatCard icon={TrendingUp}   label="Expiring Soon (30d)" value={stats?.summary?.expiring_soon}      color="bg-purple-500" link="/extinguishers" />
        <StatCard icon={Activity}     label="Total in Stock"      value={stats?.summary?.total}              color="bg-blue-500"   link="/reports" sub="All recorded units" />
        <StatCard icon={CheckCircle}  label="Upcoming Inspections" value={inspData?.inspections?.length}    color="bg-teal-500"   link="/inspections" sub="Scheduled" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status bar chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand" /> Extinguishers by Status
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusBar} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#c0392b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type pie chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Flame size={18} className="text-brand" /> By Type
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {/* Upcoming inspections */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-brand" /> Upcoming Inspections
          </h3>
          <Link to="/inspections" className="text-sm text-brand hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {inspData?.inspections?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Extinguisher</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {inspData.inspections.map(insp => (
                  <tr key={insp.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{insp.serial_number}</td>
                    <td className="py-3 px-3 text-gray-600">{insp.location}</td>
                    <td className="py-3 px-3 text-gray-600">{formatDate(insp.scheduled_date)}</td>
                    <td className="py-3 px-3 capitalize text-gray-600">{insp.inspection_type}</td>
                    <td className="py-3 px-3"><span className={getStatusBadge(insp.status)}>{insp.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <Clock size={40} className="mx-auto mb-2 opacity-40" />
            <p>No upcoming inspections</p>
          </div>
        )}
      </div>
    </div>
  );
}
