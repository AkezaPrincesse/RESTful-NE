import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Flame, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../../api/index.js';
import toast from 'react-hot-toast';

const schema = yup.object({
  first_name: yup.string().min(2, 'Min 2 characters').required('First name is required'),
  last_name: yup.string().min(2, 'Min 2 characters').required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string()
    .min(8, 'Min 8 characters')
    .matches(/[A-Z]/, 'Must contain an uppercase letter')
    .matches(/[a-z]/, 'Must contain a lowercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .matches(/[@$!%*?&]/, 'Must contain a special character (@$!%*?&)')
    .required('Password is required'),
  confirm_password: yup.string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
  phone: yup.string().optional(),
  department: yup.string().optional(),
});

export default function CreateAdminPage() {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      setError('');
      const { confirm_password, ...payload } = data;
      await authAPI.createAdmin(payload);
      setSuccess(true);
      toast.success('Admin account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin account.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-brand-dark flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Admin Created!</h2>
          <p className="text-gray-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          <div className="bg-brand px-8 py-6 text-center">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Flame size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Create Admin Account</h1>
            <p className="text-red-200 text-xs mt-1">FEMS – TWZ Ltd</p>
          </div>

          <div className="px-8 py-8">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-6">
              <ShieldCheck size={16} className="shrink-0" />
              This form creates a system administrator account with full access.
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name *</label>
                  <input
                    {...register('first_name')}
                    className={`input-field ${errors.first_name ? 'border-red-400' : ''}`}
                    placeholder="John"
                  />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input
                    {...register('last_name')}
                    className={`input-field ${errors.last_name ? 'border-red-400' : ''}`}
                    placeholder="Doe"
                  />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                </div>
              </div>

              <div>
                <label className="label">Email Address *</label>
                <input
                  {...register('email')}
                  type="email"
                  className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                  placeholder="admin@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input {...register('phone')} className="input-field" placeholder="+250788..." />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input {...register('department')} className="input-field" placeholder="IT Administration" />
                </div>
              </div>

              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    className={`input-field pr-10 ${errors.password ? 'border-red-400' : ''}`}
                    placeholder="Min 8 chars, uppercase, number & symbol"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="label">Confirm Password *</label>
                <div className="relative">
                  <input
                    {...register('confirm_password')}
                    type={showConfirm ? 'text' : 'password'}
                    className={`input-field pr-10 ${errors.confirm_password ? 'border-red-400' : ''}`}
                    placeholder="Repeat password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5 mt-2">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating admin...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={18} />
                    Create Admin Account
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
