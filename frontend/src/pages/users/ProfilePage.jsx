import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { User, Lock, Save, Shield, Mail, Phone, Building } from 'lucide-react';
import { usersAPI } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');

  const { register: regProfile, handleSubmit: hsProfile, formState: { isSubmitting: subProfile } } = useForm({
    defaultValues: { first_name: user?.first_name, last_name: user?.last_name, phone: user?.phone, department: user?.department },
  });

  const { register: regPass, handleSubmit: hsPass, reset: resetPass, formState: { errors: errPass, isSubmitting: subPass } } = useForm();

  const profileMutation = useMutation(usersAPI.updateProfile, {
    onSuccess: ({ data }) => {
      updateUser(data.data.user);
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Update failed'),
  });

  const passMutation = useMutation(usersAPI.changePassword, {
    onSuccess: () => { toast.success('Password changed!'); resetPass(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm">Manage your account settings</p>
      </div>

      {/* User card */}
      <div className="card flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-bold text-2xl">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{user?.first_name} {user?.last_name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Mail size={14} className="text-gray-400" />
            <span className="text-gray-600 text-sm">{user?.email}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Shield size={13} className="text-brand" />
            <span className="text-brand text-sm font-medium capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('profile')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'profile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1.5"><User size={14} />Profile</span>
        </button>
        <button onClick={() => setTab('password')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'password' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1.5"><Lock size={14} />Password</span>
        </button>
      </div>

      {tab === 'profile' && (
        <form onSubmit={hsProfile(d => profileMutation.mutate(d))} className="card space-y-4">
          <h3 className="font-semibold text-gray-900">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input {...regProfile('first_name')} className="input-field" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input {...regProfile('last_name')} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email} disabled className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1"><Phone size={12} />Phone</label>
              <input {...regProfile('phone')} className="input-field" placeholder="+250788..." />
            </div>
            <div>
              <label className="label flex items-center gap-1"><Building size={12} />Department</label>
              <input {...regProfile('department')} className="input-field" placeholder="Facilities" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={subProfile || profileMutation.isLoading} className="btn-primary">
              <Save size={16} />{subProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={hsPass(d => passMutation.mutate(d))} className="card space-y-4">
          <h3 className="font-semibold text-gray-900">Change Password</h3>
          <div>
            <label className="label">Current Password</label>
            <input {...regPass('current_password', { required: 'Required' })} type="password" className={`input-field ${errPass.current_password ? 'border-red-400' : ''}`} />
            {errPass.current_password && <p className="text-red-500 text-xs mt-1">{errPass.current_password.message}</p>}
          </div>
          <div>
            <label className="label">New Password</label>
            <input {...regPass('new_password', {
              required: 'Required',
              minLength: { value: 8, message: 'Min 8 characters' },
              pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, message: 'Must include uppercase, lowercase, number and special char' }
            })} type="password" className={`input-field ${errPass.new_password ? 'border-red-400' : ''}`} />
            {errPass.new_password && <p className="text-red-500 text-xs mt-1">{errPass.new_password.message}</p>}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input {...regPass('confirm_password', { required: 'Required' })} type="password" className={`input-field ${errPass.confirm_password ? 'border-red-400' : ''}`} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={subPass || passMutation.isLoading} className="btn-primary">
              <Lock size={16} />{subPass ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
