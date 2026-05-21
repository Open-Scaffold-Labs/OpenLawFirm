import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company / Organization' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ClientFormModal({ open, onClose, onSaved, client = null }) {
  const isEdit = !!client;
  const [form, setForm] = useState(initialFormState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      client_type: 'individual',
      first_name: '', last_name: '', company_name: '',
      email: '', phone: '',
      address: '', city: '', state: 'CA', zip: '',
      notes: '', status: 'active',
    };
  }

  useEffect(() => {
    if (!open) return;
    if (client) {
      setForm({ ...initialFormState(), ...client });
    } else {
      setForm(initialFormState());
    }
    setError(null);
  }, [open, client]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = { ...form };
      if (body.client_type === 'individual') {
        body.company_name = null;
      } else {
        body.first_name = null;
        body.last_name = null;
      }
      const url = isEdit ? `/api/clients/${client.id}` : '/api/clients';
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      const saved = await res.json();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? `Edit client` : 'New client'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="client-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
          </button>
        </div>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Client type" name="client_type" type="select"
            value={form.client_type} onChange={(v) => set('client_type', v)}
            required options={TYPE_OPTIONS} />
          <FormField label="Status" name="status" type="select"
            value={form.status} onChange={(v) => set('status', v)}
            options={STATUS_OPTIONS} />
        </div>
        {form.client_type === 'individual' ? (
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name" name="first_name" required
              value={form.first_name} onChange={(v) => set('first_name', v)} />
            <FormField label="Last name" name="last_name" required
              value={form.last_name} onChange={(v) => set('last_name', v)} />
          </div>
        ) : (
          <FormField label="Company name" name="company_name" required
            value={form.company_name} onChange={(v) => set('company_name', v)} />
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" name="email" type="email"
            value={form.email} onChange={(v) => set('email', v)} />
          <FormField label="Phone" name="phone" type="tel"
            value={form.phone} onChange={(v) => set('phone', v)} />
        </div>
        <FormField label="Address" name="address"
          value={form.address} onChange={(v) => set('address', v)} />
        <div className="grid grid-cols-3 gap-4">
          <FormField label="City" name="city" className="col-span-2"
            value={form.city} onChange={(v) => set('city', v)} />
          <div className="grid grid-cols-2 gap-2">
            <FormField label="State" name="state"
              value={form.state} onChange={(v) => set('state', v)} />
            <FormField label="ZIP" name="zip"
              value={form.zip} onChange={(v) => set('zip', v)} />
          </div>
        </div>
        <FormField label="Notes" name="notes" type="textarea"
          value={form.notes} onChange={(v) => set('notes', v)} />
      </form>
    </Modal>
  );
}
