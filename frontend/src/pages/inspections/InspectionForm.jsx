import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Save, ArrowLeft } from 'lucide-react';
import { inspectionsAPI, extinguishersAPI, usersAPI } from '../../api/index.js';
import toast from 'react-hot-toast';

export default function InspectionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { extinguisher_id: location.state?.extinguisher_id || '' },
  });

  const { data: extData } = useQuery('extList', () => extinguishersAPI.getAll({ limit: 100 }), {
    select: d => d.data.data.extinguishers,
  });

  const { data: inspectors } = useQuery('inspectorsList', () => usersAPI.getAll({ role: 'inspector', limit: 100 }), {
    select: d => d.data.data.users,
  });

  const mutation = useMutation(inspectionsAPI.create, {
    onSuccess: () => {
      toast.success('Inspection scheduled!');
      queryClient.invalidateQueries('inspections');
      navigate('/inspections');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to schedule'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Inspection</h1>
          <p className="text-gray-500 text-sm">Set up a new inspection for a fire extinguisher</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="card space-y-5">
        <div>
          <label className="label">Extinguisher *</label>
          <select {...register('extinguisher_id', { required: 'Select an extinguisher' })} className={`input-field ${errors.extinguisher_id ? 'border-red-400' : ''}`}>
            <option value="">Select extinguisher...</option>
            {extData?.map(e => (
              <option key={e.id} value={e.id}>{e.serial_number} — {e.location}</option>
            ))}
          </select>
          {errors.extinguisher_id && <p className="text-red-500 text-xs mt-1">{errors.extinguisher_id.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Scheduled Date & Time *</label>
            <input {...register('scheduled_date', { required: 'Required' })} type="datetime-local" className={`input-field ${errors.scheduled_date ? 'border-red-400' : ''}`} />
            {errors.scheduled_date && <p className="text-red-500 text-xs mt-1">{errors.scheduled_date.message}</p>}
          </div>
          <div>
            <label className="label">Inspection Type</label>
            <select {...register('inspection_type')} className="input-field">
              <option value="routine">Routine</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Assign Inspector</label>
            <select {...register('assigned_inspector')} className="input-field">
              <option value="">Select inspector...</option>
              {inspectors?.map(i => (
                <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select {...register('priority')} className="input-field">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={3} className="input-field resize-none" placeholder="Special instructions or notes..." />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary">
            {mutation.isLoading ? 'Scheduling...' : <><Save size={16} />Schedule Inspection</>}
          </button>
        </div>
      </form>
    </div>
  );
}
