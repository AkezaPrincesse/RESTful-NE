import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Save, ArrowLeft, Flame } from 'lucide-react';
import { extinguishersAPI } from '../../api/index.js';
import toast from 'react-hot-toast';

export default function ExtinguisherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: existing } = useQuery(
    ['extinguisher', id],
    () => extinguishersAPI.getById(id),
    { enabled: isEdit, select: d => d.data.data.extinguisher }
  );

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (existing) {
      reset({
        ...existing,
        installation_date: existing.installation_date?.split('T')[0],
        expiry_date: existing.expiry_date?.split('T')[0],
        next_inspection_date: existing.next_inspection_date?.split('T')[0],
      });
    }
  }, [existing, reset]);

  const mutation = useMutation(
    (data) => isEdit ? extinguishersAPI.update(id, data) : extinguishersAPI.create(data),
    {
      onSuccess: (res) => {
        toast.success(isEdit ? 'Extinguisher updated!' : 'Extinguisher registered!');
        queryClient.invalidateQueries('extinguishers');
        queryClient.invalidateQueries('extStats');
        navigate('/extinguishers');
      },
      onError: (err) => {
        const msg = err.response?.data?.message || 'Operation failed';
        const errs = err.response?.data?.errors;
        toast.error(errs ? errs.map(e => e.message).join(', ') : msg);
      },
    }
  );

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flame size={24} className="text-brand" />
            {isEdit ? 'Edit Extinguisher' : 'Register New Extinguisher'}
          </h1>
          <p className="text-gray-500 text-sm">{isEdit ? 'Update extinguisher details' : 'Add a new fire extinguisher to the system'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Serial Number */}
          <div>
            <label className="label">Serial Number *</label>
            <input {...register('serial_number', { required: 'Required' })} className={`input-field ${errors.serial_number ? 'border-red-400' : ''}`} placeholder="EXT-001-2024" disabled={isEdit} />
            {errors.serial_number && <p className="text-red-500 text-xs mt-1">{errors.serial_number.message}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="label">Location *</label>
            <input {...register('location', { required: 'Required' })} className={`input-field ${errors.location ? 'border-red-400' : ''}`} placeholder="Building A - Floor 1 - Lobby" />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="label">Type *</label>
            <select {...register('type', { required: 'Required' })} className={`input-field ${errors.type ? 'border-red-400' : ''}`}>
              <option value="">Select type</option>
              <option>Water</option>
              <option>CO2</option>
              <option>Foam</option>
              <option value="Dry Chemical">Dry Chemical</option>
            </select>
            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
          </div>

          {/* Size */}
          <div>
            <label className="label">Size *</label>
            <select {...register('size', { required: 'Required' })} className={`input-field ${errors.size ? 'border-red-400' : ''}`}>
              <option value="">Select size</option>
              <option value="2.5 lbs">2.5 lbs</option>
              <option value="5 lbs">5 lbs</option>
              <option value="9 lbs">9 lbs</option>
              <option value="12 lbs">12 lbs</option>
            </select>
            {errors.size && <p className="text-red-500 text-xs mt-1">{errors.size.message}</p>}
          </div>

          {/* Installation Date */}
          <div>
            <label className="label">Installation Date *</label>
            <input {...register('installation_date', { required: 'Required' })} type="date" className={`input-field ${errors.installation_date ? 'border-red-400' : ''}`} />
            {errors.installation_date && <p className="text-red-500 text-xs mt-1">{errors.installation_date.message}</p>}
          </div>

          {/* Expiry Date */}
          <div>
            <label className="label">Expiry Date *</label>
            <input {...register('expiry_date', { required: 'Required' })} type="date" className={`input-field ${errors.expiry_date ? 'border-red-400' : ''}`} />
            {errors.expiry_date && <p className="text-red-500 text-xs mt-1">{errors.expiry_date.message}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input-field">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Expired">Expired</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </div>

          {/* Next Inspection */}
          <div>
            <label className="label">Next Inspection Date</label>
            <input {...register('next_inspection_date')} type="date" className="input-field" />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="label">Manufacturer</label>
            <input {...register('manufacturer')} className="input-field" placeholder="FireGuard Inc." />
          </div>

          {/* Model */}
          <div>
            <label className="label">Model</label>
            <input {...register('model')} className="input-field" placeholder="FG-500" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={3} className="input-field resize-none" placeholder="Any additional information..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || mutation.isLoading} className="btn-primary">
            {(isSubmitting || mutation.isLoading) ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16} />{isEdit ? 'Update' : 'Register'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
