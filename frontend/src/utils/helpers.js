import { format, formatDistanceToNow, isPast, isWithinInterval, addDays } from 'date-fns';

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return 'N/A';
  try { return format(new Date(date), fmt); } catch { return 'N/A'; }
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try { return format(new Date(date), 'MMM dd, yyyy HH:mm'); } catch { return 'N/A'; }
};

export const timeAgo = (date) => {
  if (!date) return 'N/A';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return 'N/A'; }
};

export const isExpired = (date) => date && isPast(new Date(date));

export const isExpiringSoon = (date, days = 30) => {
  if (!date) return false;
  const d = new Date(date);
  return isWithinInterval(d, { start: new Date(), end: addDays(new Date(), days) });
};

export const getStatusBadge = (status) => {
  const map = {
    Active: 'badge-active',
    Inactive: 'badge-inactive',
    Expired: 'badge-expired',
    'Under Maintenance': 'badge-maintenance',
    Decommissioned: 'badge-inactive',
    scheduled: 'badge-scheduled',
    in_progress: 'badge-maintenance',
    completed: 'badge-completed',
    cancelled: 'badge-inactive',
    overdue: 'badge-overdue',
    pass: 'badge-active',
    fail: 'badge-expired',
    needs_attention: 'badge-maintenance',
  };
  return map[status] || 'badge-inactive';
};

export const getPriorityColor = (priority) => {
  const map = {
    low: 'text-gray-500',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  };
  return map[priority] || 'text-gray-500';
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
