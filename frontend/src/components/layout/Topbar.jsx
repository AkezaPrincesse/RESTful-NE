import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useQuery } from 'react-query';
import { usersAPI } from '../../api/index.js';

const breadcrumbMap = {
  dashboard: 'Dashboard',
  extinguishers: 'Extinguishers',
  inspections: 'Inspections',
  maintenance: 'Maintenance Logs',
  reports: 'Reports',
  users: 'User Management',
  profile: 'My Profile',
  new: 'New',
  edit: 'Edit',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const { data: notifsData } = useQuery(
    'notifications',
    () => usersAPI.getNotifications({ limit: 5 }),
    { select: d => d.data.data, refetchInterval: 30000 }
  );

  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs = segments.map(s => breadcrumbMap[s] || s);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
          <Menu size={22} />
        </button>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="text-gray-400" />}
              <span className={i === crumbs.length - 1 ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={20} />
            {notifsData?.unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifsData.unread > 9 ? '9+' : notifsData.unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifsData?.notifications?.length > 0 ? notifsData.notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                )) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/profile')}
        >
          <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">
            {user?.first_name} {user?.last_name}
          </span>
        </div>
      </div>
    </header>
  );
}
