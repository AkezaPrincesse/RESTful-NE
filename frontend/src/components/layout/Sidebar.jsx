import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Flame, ClipboardCheck, Wrench,
  BarChart3, Users, User, LogOut, X, Shield, UserCog
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',     roles: ['admin', 'inspector', 'user'] },
  { to: '/extinguishers',icon: Flame,           label: 'Extinguishers', roles: ['admin', 'inspector', 'user'] },
  { to: '/inspections',  icon: ClipboardCheck,  label: 'Inspections',   roles: ['admin', 'inspector', 'user'] },
  { to: '/maintenance',  icon: Wrench,          label: 'Maintenance',   roles: ['admin', 'inspector'] },
  { to: '/reports',      icon: BarChart3,       label: 'Reports',       roles: ['admin', 'inspector'] },
  { to: '/inspectors',   icon: UserCog,         label: 'Inspectors',    roles: ['admin'] },
  { to: '/users',        icon: Users,           label: 'Users',         roles: ['admin'] },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-none">TWZ Ltd</p>
              <p className="text-xs text-gray-500 leading-none mt-0.5">FEMS</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
              <div className="flex items-center gap-1">
                <Shield size={11} className="text-brand" />
                <p className="text-xs text-brand capitalize font-medium">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom links */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <User size={18} />
            My Profile
          </NavLink>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        variant="logout"
        title="Sign Out"
        message="Are you sure you want to sign out of FEMS?"
        confirmText="Yes, Sign Out"
        cancelText="Stay"
      />
    </>
  );
}
