import React, { useState, useEffect } from 'react';
import { apiFetch, getToken } from '../auth';
import { FileText, Plus, Send, DollarSign, Download, FileDown } from 'lucide-react';
import DataTable from '@openscaffold/core/components/DataTable';
import PaymentModal from '../components/PaymentModal';

const STATUS_TONES = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  void: 'bg-gray-200 text-gray-500',
};

function downloadBlob(url, filename) {
  return fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const objUrl = URL.createObjectURL(blob);
      if (filename) {
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);
      } else {
        window.open(objUrl, '_blank', 'noopener,noreferrer');
      }
    });
}

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState('');
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    const [inv, m] = await Promise.all([
      apiFetch('/api/invoices').then((r) => r.json()),
      apiFetch('/api/matters?status=open').then((r) => r.json()),
    ]);
    setInvoices(inv);
    setMatters(m);
    setLoading(false);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    const res = await apiFetch('/api/invoices/generate', {
      method: 'POST',
      body: JSON.stringify({ matter_id: parseInt(selectedMatter) }),
    });
    if (res.ok) {
      setShowGenerate(false);
      setSelectedMatter('');
      reload();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to generate invoice');
    }
  }

  async function handleStatusChange(id, status) {
    const res = await apiFetch(`/api/invoices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    if (res.ok) reload();
  }

  const totalOutstanding = invoices.filter((i) => ['sent', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

  const rows = invoices.map((i) => ({
    id: i.id,
    invoice_number: i.invoice_number,
    client: i.company_name || `${i.client_first || ''} ${i.client_last || ''}`.trim(),
    matter_number: i.matter_number,
    invoice_date: i.invoice_date,
    total_amount: parseFloat(i.total_amount),
    balance_due: parseFloat(i.balance_due),
    status: i.status,
    raw: i,
  }));

  const columns = [
    { key: 'invoice_number', label: 'Invoice #',
      render: (v) => <span className="font-mono text-law-700">{v}</span> },
    { key: 'client', label: 'Client' },
    { key: 'matter_number', label: 'Matter',
      render: (v) => <span className="text-xs font-mono text-gray-500">{v}</span> },
    { key: 'invoice_date', label: 'Date',
      render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'total_amount', label: 'Total', align: 'right',
      render: (v) => <span className="font-medium">${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
    { key: 'balance_due', label: 'Balance', align: 'right',
      render: (v) => <span className="font-medium">${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
    { key: 'status', label: 'Status',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_TONES[v]}`}>{v}</span>
      ) },
    { key: 'actions', label: 'Actions', sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => downloadBlob(`/api/invoices/${row.id}/pdf`)}
            title="Download PDF"
            className="flex items-center text-xs text-gray-700 hover:underline">
            <Download className="w-3 h-3 mr-1" /> PDF
          </button>
          <button onClick={() => downloadBlob(`/api/invoices/${row.id}/ledes`, `${row.invoice_number}.ledes`)}
            title="Download LEDES 1998B for e-billing"
            className="flex items-center text-xs text-gray-700 hover:underline">
            <FileDown className="w-3 h-3 mr-1" /> LEDES
          </button>
          {row.status === 'draft' && (
            <button onClick={() => handleStatusChange(row.id, 'sent')}
              className="flex items-center text-xs text-blue-700 hover:underline">
              <Send className="w-3 h-3 mr-1" /> Send
            </button>
          )}
          {['sent', 'partial', 'overdue'].includes(row.status) && (
            <button onClick={() => setPaymentInvoice(row.raw)}
              className="flex items-center text-xs text-emerald-700 hover:underline">
              <DollarSign className="w-3 h-3 mr-1" /> Pay
            </button>
          )}
        </div>
      ) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-law-600" /> Invoices
        </h1>
        <button onClick={() => setShowGenerate(!showGenerate)}
          className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> Generate Invoice
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Invoices</div>
          <div className="text-xl font-bold">{invoices.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Outstanding Balance</div>
          <div className="text-xl font-bold text-amber-700">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Paid (All Time)</div>
          <div className="text-xl font-bold text-green-700">${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {showGenerate && (
        <form onSubmit={handleGenerate} className="bg-white rounded-xl border p-5 mb-6 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Matter</label>
            <select value={selectedMatter} onChange={(e) => setSelectedMatter(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-law-500">
              <option value="">Choose a matter to invoice…</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-law-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-law-700">
            Generate
          </button>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading invoices…</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchable
          searchFields={['invoice_number', 'client', 'matter_number']}
          pageSize={25}
          emptyMessage="No invoices yet"
        />
      )}

      <PaymentModal
        open={paymentInvoice !== null}
        onClose={() => setPaymentInvoice(null)}
        onSaved={() => { setPaymentInvoice(null); reload(); }}
        invoice={paymentInvoice}
      />
    </div>
  );
}
