import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

export default function TimeEntryFormModal({ open, onClose, onSaved, entry = null, defaultMatterId = null }) {
  const isEdit = !!entry;
  const [form, setForm] = useState(initialFormState());
  const [matters, setMatters] = useState([]);
  const [activityCodes, setActivityCodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      matter_id: defaultMatterId || '',
      entry_date: new Date().toISOString().slice(0, 10),
      hours: 0.1,
      description: '',
      activity_code: '',
      billable: true,
    };
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch('/api/matters?status=open').then((r) => r.json()),
      apiFetch('/api/activity-codes').then((r) => r.json()),
    ]).then(([ms, codes]) => {
      setMatters(ms);
      setActivityCodes(codes);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setForm({
        ...initialFormState(),
        ...entry,
        entry_date: entry.entry_date ? String(entry.entry_date).slice(0, 10) : initialFormState().entry_date,
        hours: parseFloat(entry.hours),
      });
    } else {
      setForm(initialFormState());
    }
    setError(null);
  }, [open, entry, defaultMatterId]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        matter_id: Number(form.matter_id),
        entry_date: form.entry_date,
        hours: Number(form.hours),
        description: form.description,
        activity_code: form.activity_code || null,
        billable: !!form.billable,
      };
      const url = isEdit ? `/api/time-entries/${entry.id}` : '/api/time-entries';
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
      title={isEdit ? 'Edit time entry' : 'New time entry'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="time-entry-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Log time'}
          </button>
        </div>
      }
    >
      <form id="time-entry-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <FormField label="Matter" name="matter_id" type="select" required
          value={form.matter_id} onChange={(v) => set('matter_id', v)}
          options={matters.map((m) => ({
            value: m.id,
            label: `${m.matter_number} — ${m.title}`,
          }))} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date" name="entry_date" type="date" required
            value={form.entry_date} onChange={(v) => set('entry_date', v)} />
          <FormField label="Hours (0.1 increments)" name="hours" type="number" required
            value={form.hours} onChange={(v) => set('hours', v)}
            inputProps={{ step: '0.1', min: '0.1' }}
            hint={`= ${Math.round((form.hours || 0) * 60)} minutes`} />
        </div>
        <FormField label="LEDES activity code" name="activity_code" type="select"
          value={form.activity_code} onChange={(v) => set('activity_code', v)}
          hint="Required before invoice export"
          options={activityCodes.map((c) => ({
            value: c.code, label: `${c.code} — ${c.description || c.name || ''}`,
          }))} />
        <FormField label="Description" name="description" type="textarea" required
          value={form.description} onChange={(v) => set('description', v)}
          placeholder="Telephone conference with client re settlement posture" />
        <FormField label="Billable" name="billable" type="toggle"
          value={form.billable} onChange={(v) => set('billable', v)} />
      </form>
    </Modal>
  );
}
