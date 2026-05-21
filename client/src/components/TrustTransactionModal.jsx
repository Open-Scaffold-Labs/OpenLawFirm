import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import Modal from './Modal';
import FormField from './FormField';

/**
 * Modal for creating a trust deposit or disbursement.
 * `kind` must be 'deposit' or 'disbursement'.
 * Trust transactions are immutable — no edit/delete path. Errors must be
 * resolved with a corrective transaction (reverse + reissue) per bar rules.
 */
export default function TrustTransactionModal({ open, onClose, onSaved, kind }) {
  const [form, setForm] = useState(initialFormState());
  const [accounts, setAccounts] = useState([]);
  const [matters, setMatters] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const title = kind === 'deposit' ? 'Trust deposit' : 'Trust disbursement';
  const actionLabel = kind === 'deposit' ? 'Record deposit' : 'Record disbursement';

  function initialFormState() {
    return {
      trust_account_id: '',
      matter_id: '',
      client_id: '',
      amount: '',
      description: '',
      check_number: '',
      reference_number: '',
    };
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch('/api/trust/accounts').then((r) => r.json()),
      apiFetch('/api/matters?status=open').then((r) => r.json()),
      apiFetch('/api/clients').then((r) => r.json()),
    ]).then(([accts, ms, cs]) => {
      setAccounts(accts);
      setMatters(ms);
      setClients(cs);
      // Default to first active trust account
      const active = accts.find((a) => a.status === 'active') || accts[0];
      if (active) setForm((f) => ({ ...f, trust_account_id: active.id }));
    });
    setError(null);
  }, [open]);

  useEffect(() => {
    if (open) setForm(initialFormState());
  }, [open, kind]);

  // When a matter is selected, auto-fill the client_id
  useEffect(() => {
    if (!form.matter_id) return;
    const m = matters.find((x) => x.id === Number(form.matter_id));
    if (m && m.client_id && !form.client_id) {
      setForm((f) => ({ ...f, client_id: m.client_id }));
    }
  }, [form.matter_id, matters]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        trust_account_id: Number(form.trust_account_id),
        client_id: form.client_id ? Number(form.client_id) : null,
        matter_id: form.matter_id ? Number(form.matter_id) : null,
        amount: Number(form.amount),
        description: form.description,
        check_number: form.check_number || null,
        reference_number: form.reference_number || null,
      };
      const res = await apiFetch(`/api/trust/${kind}`, {
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

  return (
    <Modal
      open={open} onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" form="trust-form" disabled={saving}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-60 ${
              kind === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}>
            {saving ? 'Saving…' : actionLabel}
          </button>
        </div>
      }
    >
      <form id="trust-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg px-3 py-2">
          <strong>Audit-immutable.</strong> Trust transactions cannot be edited or deleted after creation.
          To correct an error, record a reversing transaction and a new one. This preserves the audit trail
          required for IOLTA three-way reconciliation.
        </div>
        <FormField label="Trust account" name="trust_account_id" type="select" required
          value={form.trust_account_id} onChange={(v) => set('trust_account_id', v)}
          options={accounts.map((a) => ({
            value: a.id,
            label: `${a.account_name} (current balance: $${parseFloat(a.balance || 0).toLocaleString()})`,
          }))} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Matter" name="matter_id" type="select" required
            value={form.matter_id} onChange={(v) => set('matter_id', v)}
            options={matters.map((m) => ({ value: m.id, label: `${m.matter_number} — ${m.title}` }))} />
          <FormField label="Client" name="client_id" type="select" required
            value={form.client_id} onChange={(v) => set('client_id', v)}
            hint="Auto-fills when matter is chosen"
            options={clients.map((c) => ({
              value: c.id,
              label: c.client_type === 'company' ? c.company_name : `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            }))} />
        </div>
        <FormField label="Amount ($)" name="amount" type="number" required
          value={form.amount} onChange={(v) => set('amount', v)}
          inputProps={{ step: '0.01', min: '0.01' }} />
        <FormField label="Description" name="description" required
          value={form.description} onChange={(v) => set('description', v)}
          placeholder={kind === 'deposit' ? 'Sandoval initial retainer' : 'Court filing fees'} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Check number" name="check_number"
            value={form.check_number} onChange={(v) => set('check_number', v)} />
          <FormField label="Reference number" name="reference_number"
            value={form.reference_number} onChange={(v) => set('reference_number', v)} />
        </div>
      </form>
    </Modal>
  );
}
