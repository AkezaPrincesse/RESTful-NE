import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Save, ArrowLeft } from 'lucide-react';
import { maintenanceAPI, extinguishersAPI, inspectionsAPI } from '../../api/index.js';
import toast from 'react-hot-toast';

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      extinguisher_id: location.state?.extinguisher_id || '',
      action_date: new Date().toISOString().split('T')[0],
      result: 'pass',
    },
  });

  const { data: extData } = useQuery('extList', () => extinguishersAPI.getAll({ limit: 100 }), {
    select: d => d.data.data.extinguishers,
  });

  const mutation = useMutation(maintenanceAPI.create, {
    onSuccess: () => {
      toast.success('Maintenance logged!');
      queryClient.invalidateQueries('maintenance');
      navigate('/maintenance');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to log maintenance'),
  });

  const CheckField = ({ name, label }) => (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input {...register(name)} type="checkbox" className="w-4 h-4 accent-brand rounded" />
      {label}
    </label>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log Maintenance Activity</h1>
          <p className="text-gray-500 text-sm">Record inspection or maintenance action</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Extinguisher *</label>
            <select {...register('extinguisher_id', { required: 'Select extinguisher' })} className={`input-field ${errors.extinguisher_id ? 'border-red-400' : ''}`}>
              <option value="">Select extinguisher...</option>
              {extData?.map(e => (
                <option key={e.id} value={e.id}>{e.serial_number} — {e.location}</option>
              ))}
            </select>
            {errors.extinguisher_id && <p className="text-red-500 text-xs mt-1">{errors.extinguisher_id.message}</p>}
          </div>

          <div>
            <label className="label">Action Date *</label>
            <input {...register('action_date', { required: 'Required' })} type="date" className={`input-field ${errors.action_date ? 'border-red-400' : ''}`} />
          </div>
          <div>
            <label className="label">Result</label>
            <select {...register('result')} className="input-field">
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="needs_attention">Needs Attention</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Actions Taken *</label>
          <textarea {...register('action_taken', { required: 'Describe actions taken' })} rows={3} className={`input-field resize-none ${errors.action_taken ? 'border-red-400' : ''}`} placeholder="Describe the maintenance actions performed..." />
          {errors.action_taken && <p className="text-red-500 text-xs mt-1">{errors.action_taken.message}</p>}
        </div>

        <div>
          <label className="label">Conditions Noted</label>
          <textarea {...register('conditions_noted')} rows={2} className="input-field resize-none" placeholder="Describe the condition of the extinguisher..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Pressure Reading (psi)</label>
            <input {...register('pressure_reading')} type="number" step="0.1" className="input-field" placeholder="195.0" />
          </div>
          <div>
            <label className="label">Weight Reading (lbs)</label>
            <input {...register('weight_reading')} type="number" step="0.1" className="input-field" placeholder="5.0" />
          </div>
          <div>
            <label className="label">Cost (USD)</label>
            <input {...register('cost')} type="number" step="0.01" className="input-field" placeholder="0.00" />
          </div>
        </div>

        {/* Condition checkboxes */}
        <div>
          <label className="label">Condition Checks</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            <CheckField name="seal_intact" label="Seal Intact" />
            <CheckField name="pin_intact" label="Pin Intact" />
            <CheckField name="label_readable" label="Label Readable" />
            <CheckField name="physical_damage" label="Physical Damage" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Next Service Date</label>
            <input {...register('next_service_date')} type="date" className="input-field" />
          </div>
          <div>
            <label className="label">Parts Replaced</label>
            <input {...register('parts_replaced')} className="input-field" placeholder="e.g., Seal, Safety pin" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isLoading} className="btn-primary">
            {mutation.isLoading ? 'Saving...' : <><Save size={16} />Save Log</>}
          </button>
        </div>
      </form>
    </div>
  );
}
