import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
];

const BILLING_OPTIONS = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'flat_fee', label: 'Flat Fee' },
  { value: 'contingency', label: 'Contingency' },
  { value: 'retainer', label: 'Retainer' },
];

/**
 * Modal for creating or editing a Matter.
 * Pass `matter` to edit an existing one (the form prefills); omit to create.
 */
export default function MatterFormModal({ open, onClose, onSaved, matter = null }) {
  const isEdit = !!matter;
  const [form, setForm] = useState(initialFormState());
  const [clients, setClients] = useState([]);
  const [practiceAreas, setPracticeAreas] = useState([]);
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      matter_number: '', client_id: '', title: '', practice_area_id: '',
      billing_type: 'hourly', billing_rate: 350,
      responsible_attorney: '', statute_of_limitations: '',
      opposing_party: '', opposing_counsel: '',
      court_name: '', case_number: '',
      notes: '', status: 'open',
    };
  }

  // Load lookups once when modal opens
  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch('/api/clients').then((r) => r.json()),
      apiFetch('/api/practice-areas').then((r) => r.json()),
      apiFetch('/api/staff').then((r) => r.json()),
    ]).then(([cs, pas, st]) => {
      setClients(cs);
      setPracticeAreas(pas);
      setStaff(st);
    });
  }, [open]);

  // Prefill from matter when editing
  useEffect(() => {
    if (!open) return;
    if (matter) {
      setForm({
        ...initialFormState(),
        ...matter,
        statute_of_limitations: matter.statute_of_limitations
          ? String(matter.statute_of_limitations).slice(0, 10) : '',
      });
    } else {
      // Generate a suggested matter number for new matters
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 900 + 100);
      setForm({ ...initialFormState(), matter_number: `${year}-${random}` });
    }
    setError(null);
  }, [open, matter]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        ...form,
        client_id: form.client_id ? Number(form.client_id) : null,
        practice_area_id: form.practice_area_id ? Number(form.practice_area_id) : null,
        responsible_attorney: form.responsible_attorney ? Number(form.responsible_attorney) : null,
        billing_rate: form.billing_rate ? Number(form.billing_rate) : null,
        statute_of_limitations: form.statute_of_limitations || null,
      };
      const url = isEdit ? `/api/matters/${matter.id}` : '/api/matters';
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
      title={isEdit ? `Edit matter ${matter?.matter_number}` : 'New matter'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button type="submit" form="matter-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create matter'}
          </button>
        </div>
      }
    >
      <form id="matter-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Matter number" name="matter_number"
            value={form.matter_number} onChange={(v) => set('matter_number', v)}
            required placeholder="2026-001" />
          <FormField label="Status" name="status" type="select"
            value={form.status} onChange={(v) => set('status', v)}
            required options={STATUS_OPTIONS} />
        </div>
        <FormField label="Title" name="title"
          value={form.title} onChange={(v) => set('title', v)}
          required placeholder="Sandoval v. Acme Foods" />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Client" name="client_id" type="select"
            value={form.client_id} onChange={(v) => set('client_id', v)}
            required
            options={clients.map((c) => ({
              value: c.id,
              label: c.client_type === 'company'
                ? c.company_name
                : `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            }))} />
          <FormField label="Practice area" name="practice_area_id" type="select"
            value={form.practice_area_id} onChange={(v) => set('practice_area_id', v)}
            options={practiceAreas.map((p) => ({ value: p.id, label: p.name }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Responsible attorney" name="responsible_attorney" type="select"
            value={form.responsible_attorney} onChange={(v) => set('responsible_attorney', v)}
            options={staff.map((s) => ({ value: s.id, label: s.name || s.username }))} />
          <FormField label="Statute of limitations" name="statute_of_limitations" type="date"
            value={form.statute_of_limitations} onChange={(v) => set('statute_of_limitations', v)}
            hint="Leave blank if not applicable" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Billing type" name="billing_type" type="select"
            value={form.billing_type} onChange={(v) => set('billing_type', v)}
            required options={BILLING_OPTIONS} />
          <FormField label="Billing rate ($/hr)" name="billing_rate" type="number"
            value={form.billing_rate} onChange={(v) => set('billing_rate', v)}
            inputProps={{ step: '25', min: '0' }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Opposing party" name="opposing_party"
            value={form.opposing_party} onChange={(v) => set('opposing_party', v)} />
          <FormField label="Opposing counsel" name="opposing_counsel"
            value={form.opposing_counsel} onChange={(v) => set('opposing_counsel', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Court" name="court_name"
            value={form.court_name} onChange={(v) => set('court_name', v)} />
          <FormField label="Case number" name="case_number"
            value={form.case_number} onChange={(v) => set('case_number', v)} />
        </div>
        <FormField label="Notes" name="notes" type="textarea"
          value={form.notes} onChange={(v) => set('notes', v)}
          inputProps={{ rows: 3 }} />
      </form>
    </Modal>
  );
}
