import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const CATEGORY_OPTIONS = [
  { value: 'filing_fee', label: 'Filing fee' },
  { value: 'court_reporter', label: 'Court reporter / deposition' },
  { value: 'expert_witness', label: 'Expert witness' },
  { value: 'travel', label: 'Travel / mileage' },
  { value: 'postage', label: 'Postage / delivery' },
  { value: 'copies', label: 'Copies / printing' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'records_request', label: 'Records request' },
  { value: 'other', label: 'Other' },
];

export default function ExpenseFormModal({ open, onClose, onSaved, expense = null, defaultMatterId = null }) {
  const isEdit = !!expense;
  const [form, setForm] = useState(initialFormState());
  const [matters, setMatters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      matter_id: defaultMatterId || '',
      expense_date: new Date().toISOString().slice(0, 10),
      amount: '',
      description: '',
      category: 'other',
      billable: true,
    };
  }

  useEffect(() => {
    if (!open) return;
    apiFetch('/api/matters?status=open').then((r) => r.json()).then(setMatters);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setForm({
        ...initialFormState(),
        ...expense,
        expense_date: expense.expense_date ? String(expense.expense_date).slice(0, 10) : initialFormState().expense_date,
        amount: parseFloat(expense.amount),
      });
    } else {
      setForm(initialFormState());
    }
    setError(null);
  }, [open, expense, defaultMatterId]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        matter_id: Number(form.matter_id),
        expense_date: form.expense_date,
        amount: Number(form.amount),
        description: form.description,
        category: form.category || null,
        billable: !!form.billable,
      };
      const url = isEdit ? `/api/expenses/${expense.id}` : '/api/expenses';
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
      title={isEdit ? 'Edit expense' : 'New expense'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="expense-form" disabled={saving}
            className="px-4 py-2 text-sm bg-law-600 text-white rounded-lg hover:bg-law-700 disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <FormField label="Matter" name="matter_id" type="select" required
          value={form.matter_id} onChange={(v) => set('matter_id', v)}
          options={matters.map((m) => ({ value: m.id, label: `${m.matter_number} — ${m.title}` }))} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date" name="expense_date" type="date" required
            value={form.expense_date} onChange={(v) => set('expense_date', v)} />
          <FormField label="Amount ($)" name="amount" type="number" required
            value={form.amount} onChange={(v) => set('amount', v)}
            inputProps={{ step: '0.01', min: '0.01' }} />
        </div>
        <FormField label="Category" name="category" type="select"
          value={form.category} onChange={(v) => set('category', v)}
          options={CATEGORY_OPTIONS} />
        <FormField label="Description" name="description" type="textarea" required
          value={form.description} onChange={(v) => set('description', v)}
          placeholder="e.g., Filing fee for Sandoval complaint" />
        <FormField label="Billable" name="billable" type="toggle"
          value={form.billable} onChange={(v) => set('billable', v)} />
      </form>
    </Modal>
  );
}
