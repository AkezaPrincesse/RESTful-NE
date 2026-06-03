import api from './axios';

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  refreshToken: (data) => api.post('/auth/refresh', data),
  createAdmin: (data) => api.post('/auth/create-admin', data),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/profile/password', data),
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getNotifications: (params) => api.get('/users/notifications', { params }),
  markNotificationRead: (id) => api.put(`/users/notifications/${id}/read`),
};

// Extinguishers API
export const extinguishersAPI = {
  getStats: () => api.get('/extinguishers/stats'),
  getAll: (params) => api.get('/extinguishers', { params }),
  getById: (id) => api.get(`/extinguishers/${id}`),
  create: (data) => api.post('/extinguishers', data),
  update: (id, data) => api.put(`/extinguishers/${id}`, data),
  delete: (id) => api.delete(`/extinguishers/${id}`),
};

// Inspections API
export const inspectionsAPI = {
  getAll: (params) => api.get('/inspections', { params }),
  getById: (id) => api.get(`/inspections/${id}`),
  create: (data) => api.post('/inspections', data),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  cancel: (id) => api.delete(`/inspections/${id}`),
};

// Maintenance API
export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
};

// Reports API
export const reportsAPI = {
  getOverview: (params) => api.get('/reports/overview', { params }),
  getMaintenanceHistory: (params) => api.get('/reports/maintenance-history', { params }),
  getStock: (params) => api.get('/reports/stock', { params }),
  exportPDF: () => api.get('/reports/export/pdf', { responseType: 'blob' }),
  exportCSV: (type) => api.get('/reports/export/csv', { params: { type }, responseType: 'blob' }),
};
