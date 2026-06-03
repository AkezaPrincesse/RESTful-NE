import React from 'react';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';

const ICONS = {
  delete:  { icon: Trash2,        iconBg: 'bg-red-100',    iconColor: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700' },
  logout:  { icon: LogOut,        iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  btn: 'bg-amber-600 hover:bg-amber-700' },
  warning: { icon: AlertTriangle, iconBg: 'bg-orange-100', iconColor: 'text-orange-600', btn: 'bg-orange-600 hover:bg-orange-700' },
};

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title, message,
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  variant     = 'warning',
  loading     = false,
}) {
  if (!open) return null;

  const { icon: Icon, iconBg, iconColor, btn } = ICONS[variant] || ICONS.warning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!loading ? onClose : undefined} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center`}>
            <Icon size={32} className={iconColor} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium text-sm ${btn} disabled:opacity-60 transition-colors flex items-center justify-center gap-2`}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
