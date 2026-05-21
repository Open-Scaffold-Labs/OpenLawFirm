import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

const METHOD_OPTIONS = [
  { value: 'check', label: 'Check' },
  { value: 'wire', label: 'Wire transfer' },
  { value: 'ach', label: 'ACH' },
  { value: 'card', label: 'Credit card' },
  { value: 'cash', label: 'Cash' },
  { value: 'trust_draw', label: 'Trust draw' },
  { value: 'other', label: 'Other' },
];

export default function PaymentModal({ open, onClose, onSaved, invoice }) {
  const [form, setForm] = useState(initialFormState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function initialFormState() {
    return {
      amount: invoice?.balance_due || '',
      payment_method: 'check',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_number: '',
      notes: '',
    };
  }

  useEffect(() => {
    if (open) setForm(initialFormState());
    setError(null);
  }, [open, invoice]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        reference_number: form.reference_number || null,
        notes: form.notes || null,
      };
      const res = await apiFetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
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

  if (!invoice) return null;

  return (
    <Modal
      open={open} onClose={onClose}
      title={`Record payment — ${invoice.invoice_number}`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="payment-form" disabled={saving}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60">
            {saving ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 space-y-0.5">
          <div>Invoice total: <strong>${parseFloat(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
          <div>Outstanding: <strong className="text-amber-700">${parseFloat(invoice.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Payment amount ($)" name="amount" type="number" required
            value={form.amount} onChange={(v) => set('amount', v)}
            inputProps={{ step: '0.01', min: '0.01', max: String(invoice.balance_due) }} />
          <FormField label="Payment date" name="payment_date" type="date" required
            value={form.payment_date} onChange={(v) => set('payment_date', v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Method" name="payment_method" type="select" required
            value={form.payment_method} onChange={(v) => set('payment_method', v)}
            options={METHOD_OPTIONS} />
          <FormField label="Reference / check #" name="reference_number"
            value={form.reference_number} onChange={(v) => set('reference_number', v)} />
        </div>
        <FormField label="Notes" name="notes" type="textarea"
          value={form.notes} onChange={(v) => set('notes', v)} />
      </form>
    </Modal>
  );
}
