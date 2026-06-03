import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';

import Dashboard from './pages/Dashboard.jsx';
import ExtinguisherList from './pages/extinguishers/ExtinguisherList.jsx';
import ExtinguisherDetail from './pages/extinguishers/ExtinguisherDetail.jsx';
import ExtinguisherForm from './pages/extinguishers/ExtinguisherForm.jsx';
import InspectionList from './pages/inspections/InspectionList.jsx';
import InspectionForm from './pages/inspections/InspectionForm.jsx';
import MaintenanceList from './pages/inspections/MaintenanceList.jsx';
import MaintenanceForm from './pages/inspections/MaintenanceForm.jsx';
import ReportsPage from './pages/reports/ReportsPage.jsx';
import UserList from './pages/users/UserList.jsx';
import ProfilePage from './pages/users/ProfilePage.jsx';
import NotFound from './pages/NotFound.jsx';

const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/extinguishers" element={<ExtinguisherList />} />
        <Route path="/extinguishers/new" element={<ProtectedRoute roles={['admin', 'inspector']}><ExtinguisherForm /></ProtectedRoute>} />
        <Route path="/extinguishers/:id" element={<ExtinguisherDetail />} />
        <Route path="/extinguishers/:id/edit" element={<ProtectedRoute roles={['admin', 'inspector']}><ExtinguisherForm /></ProtectedRoute>} />

        <Route path="/inspections" element={<InspectionList />} />
        <Route path="/inspections/new" element={<InspectionForm />} />
        <Route path="/maintenance" element={<MaintenanceList />} />
        <Route path="/maintenance/new" element={<ProtectedRoute roles={['admin', 'inspector']}><MaintenanceForm /></ProtectedRoute>} />

        <Route path="/reports" element={<ProtectedRoute roles={['admin', 'inspector']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><UserList /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
