import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const CONTACT_TYPE_OPTIONS = [
  { value: 'opposing_counsel', label: 'Opposing counsel' },
  { value: 'opposing_party', label: 'Opposing party' },
  { value: 'witness', label: 'Witness' },
  { value: 'expert', label: 'Expert witness' },
  { value: 'court_clerk', label: 'Court clerk' },
  { value: 'co_counsel', label: 'Co-counsel' },
  { value: 'mediator', label: 'Mediator / arbitrator' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'other', label: 'Other' },
];

export default function ContactFormModal({ open, onClose, onSaved, matterId, contact = null }) {
  const isEdit = !!contact;
  const [form, setForm] = useState(initialFormState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      contact_type: 'opposing_counsel',
      name: '', firm_name: '',
      email: '', phone: '',
      address: '', notes: '',
    };
  }

  useEffect(() => {
    if (!open) return;
    setForm(contact ? { ...initialFormState(), ...contact } : initialFormState());
    setError(null);
  }, [open, contact]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = { ...form };
      const url = isEdit
        ? `/api/matters/${matterId}/contacts/${contact.id}`
        : `/api/matters/${matterId}/contacts`;
      const res = await apiFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
      onSaved?.(await res.json());
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
      title={isEdit ? 'Edit contact' : 'Add contact'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="contact-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      }
    >
      <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <FormField label="Role" name="contact_type" type="select" required
          value={form.contact_type} onChange={(v) => set('contact_type', v)}
          options={CONTACT_TYPE_OPTIONS} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" name="name" required
            value={form.name} onChange={(v) => set('name', v)} />
          <FormField label="Firm / organization" name="firm_name"
            value={form.firm_name} onChange={(v) => set('firm_name', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" name="email" type="email"
            value={form.email} onChange={(v) => set('email', v)} />
          <FormField label="Phone" name="phone" type="tel"
            value={form.phone} onChange={(v) => set('phone', v)} />
        </div>
        <FormField label="Address" name="address"
          value={form.address} onChange={(v) => set('address', v)} />
        <FormField label="Notes" name="notes" type="textarea"
          value={form.notes} onChange={(v) => set('notes', v)} />
      </form>
    </Modal>
  );
}
