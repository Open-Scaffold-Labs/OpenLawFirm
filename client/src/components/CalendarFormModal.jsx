import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const EVENT_TYPES = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'filing_deadline', label: 'Filing deadline' },
  { value: 'statute_of_limitations', label: 'Statute of limitations' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'other', label: 'Other' },
];

export default function CalendarFormModal({ open, onClose, onSaved, event = null }) {
  const isEdit = !!event;
  const [form, setForm] = useState(initialFormState());
  const [matters, setMatters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return {
      title: '',
      event_type: 'deadline',
      matter_id: '',
      start_time: tomorrow.toISOString().slice(0, 16),
      end_time: '',
      all_day: false,
      location: '',
      description: '',
      reminder_minutes: 1440,
      is_court_date: false,
    };
  }

  useEffect(() => {
    if (!open) return;
    apiFetch('/api/matters?status=open').then((r) => r.json()).then(setMatters);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setForm({
        ...initialFormState(),
        ...event,
        start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
        end_time: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
      });
    } else {
      setForm(initialFormState());
    }
    setError(null);
  }, [open, event]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        ...form,
        matter_id: form.matter_id ? Number(form.matter_id) : null,
        reminder_minutes: form.reminder_minutes ? Number(form.reminder_minutes) : null,
        start_time: form.start_time,
        end_time: form.end_time || null,
      };
      const url = isEdit ? `/api/calendar/${event.id}` : '/api/calendar';
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
      title={isEdit ? 'Edit calendar event' : 'New calendar event'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="calendar-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      }
    >
      <form id="calendar-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <FormField label="Title" name="title" required
          value={form.title} onChange={(v) => set('title', v)}
          placeholder="Sandoval: Motion for Summary Judgment due" />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Event type" name="event_type" type="select" required
            value={form.event_type} onChange={(v) => set('event_type', v)}
            options={EVENT_TYPES} />
          <FormField label="Matter" name="matter_id" type="select"
            value={form.matter_id} onChange={(v) => set('matter_id', v)}
            options={matters.map((m) => ({ value: m.id, label: `${m.matter_number} — ${m.title}` }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start time" name="start_time" type="datetime-local" required
            value={form.start_time} onChange={(v) => set('start_time', v)} />
          <FormField label="End time" name="end_time" type="datetime-local"
            value={form.end_time} onChange={(v) => set('end_time', v)}
            hint="Optional" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="All day" name="all_day" type="toggle"
            value={form.all_day} onChange={(v) => set('all_day', v)} />
          <FormField label="Court date" name="is_court_date" type="toggle"
            value={form.is_court_date} onChange={(v) => set('is_court_date', v)} />
        </div>
        <FormField label="Location" name="location"
          value={form.location} onChange={(v) => set('location', v)}
          placeholder="Department 12, Alameda County Superior Court" />
        <FormField label="Description" name="description" type="textarea"
          value={form.description} onChange={(v) => set('description', v)} />
        <FormField label="Reminder (minutes before)" name="reminder_minutes" type="number"
          value={form.reminder_minutes} onChange={(v) => set('reminder_minutes', v)}
          inputProps={{ step: '30', min: '0' }}
          hint="1440 = 24 hours" />
      </form>
    </Modal>
  );
}
