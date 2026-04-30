import React, { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Field {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}

interface Component {
  id: string;
  title?: string;
  fields?: Field[];
  dataSource?: string;
}

interface DynamicFormProps {
  component: Component;
  appId: string | null;
}

export default function DynamicForm({ component, appId }: DynamicFormProps) {
  const fields = component.fields || [];
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    fields.forEach(f => { init[f.name] = f.defaultValue ?? ''; });
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      const val = formData[field.name];
      if (field.required && (val === '' || val === null || val === undefined)) {
        newErrors[field.name] = `${field.label || field.name} is required`;
      }
      if (field.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
        newErrors[field.name] = 'Invalid email address';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (!appId || !component.dataSource) {
      toast('Form submitted (preview mode — no app saved yet)', { icon: 'ℹ️' });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/apps/${appId}/data/${component.dataSource}`, formData);
      toast.success('Record created!');
      setSubmitted(true);
      // Reset form
      const reset: Record<string, unknown> = {};
      fields.forEach(f => { reset[f.name] = f.defaultValue ?? ''; });
      setFormData(reset);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(name: string, value: unknown) {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  }

  if (fields.length === 0) {
    return (
      <div className="bg-dark-800 border border-amber-500/20 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-2">{component.title || 'Form'}</h3>
        <p className="text-amber-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> No fields defined for this form
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/40">
        <h3 className="text-white font-semibold">{component.title || 'Form'}</h3>
        {component.dataSource && (
          <p className="text-xs text-slate-500 mt-0.5">→ {component.dataSource}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(field => (
            <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-sm text-slate-400 mb-1.5">
                {field.label || field.name}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <FieldInput
                field={field}
                value={formData[field.name]}
                onChange={(v) => handleChange(field.name, v)}
                error={errors[field.name]}
              />
              {errors[field.name] && (
                <p className="text-red-400 text-xs mt-1">{errors[field.name]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit
          </button>
          {submitted && (
            <span className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" /> Submitted!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const baseClass = `w-full bg-dark-900 border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none transition-colors ${
    error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-600/50 focus:border-primary-500'
  }`;

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${baseClass} resize-none`}
        />
      );

    case 'select':
      return (
        <select
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          className={`${baseClass} bg-dark-900`}
        >
          <option value="">Select an option</option>
          {(field.options || []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 accent-primary-500 rounded"
          />
          <span className="text-sm text-slate-400">{field.label || field.name}</span>
        </label>
      );

    case 'number':
      return (
        <input
          type="number"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder}
          className={baseClass}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          className={`${baseClass} [color-scheme:dark]`}
        />
      );

    case 'file':
      return (
        <input
          type="file"
          onChange={e => onChange(e.target.files?.[0]?.name || '')}
          className={`${baseClass} file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-600/20 file:text-primary-300 file:text-xs cursor-pointer`}
        />
      );

    default:
      return (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'password' ? 'password' : 'text'}
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseClass}
        />
      );
  }
}
