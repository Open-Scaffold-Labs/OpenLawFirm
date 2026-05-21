import React, { useState, useEffect } from 'react';
import { apiFetch, getToken } from '../auth';
import { FileText, Plus, Send, DollarSign, Download, FileDown } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';

export default function Billing({ onNavigate }) {
  const [invoices, setInvoices] = useState([]);
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState('');
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/invoices').then(r => r.json()),
      apiFetch('/api/matters?status=open').then(r => r.json()),
    ]).then(([inv, m]) => {
      setInvoices(inv);
      setMatters(m);
    }).finally(() => setLoading(false));
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    const res = await apiFetch('/api/invoices/generate', {
      method: 'POST',
      body: JSON.stringify({ matter_id: parseInt(selectedMatter) }),
    });
    if (res.ok) {
      const inv = await res.json();
      setInvoices([inv, ...invoices]);
      setShowGenerate(false);
      setSelectedMatter('');
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
    if (res.ok) {
      const updated = await res.json();
      setInvoices(invoices.map(i => i.id === id ? { ...i, ...updated } : i));
    }
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    void: 'bg-gray-200 text-gray-500',
  };

  const totalOutstanding = invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.balance_due || 0), 0);

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

      {/* Summary */}
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
          <div className="text-xl font-bold text-green-700">
            ${invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Generate form */}
      {showGenerate && (
        <form onSubmit={handleGenerate} className="bg-white rounded-xl border p-5 mb-6 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Matter</label>
            <select value={selectedMatter} onChange={e => setSelectedMatter(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-law-500">
              <option value="">Choose a matter to invoice...</option>
              {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
            </select>
          </div>
          <button type="submit" className="bg-law-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-law-700">
            Generate
          </button>
        </form>
      )}

      {/* Invoices table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Matter</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No invoices yet</td></tr>
            ) : invoices.map(i => (
              <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-law-700">{i.invoice_number}</td>
                <td className="px-4 py-3">{i.company_name || `${i.client_first || ''} ${i.client_last || ''}`}</td>
                <td className="px-4 py-3 text-xs font-mono">{i.matter_number}</td>
                <td className="px-4 py-3">{new Date(i.invoice_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right font-medium">${parseFloat(i.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-right font-medium">${parseFloat(i.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[i.status]}`}>
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/invoices/${i.id}/pdf`}
                      onClick={(ev) => {
                        ev.preventDefault();
                        fetch(`/api/invoices/${i.id}/pdf`, {
                          headers: { Authorization: `Bearer ${getToken()}` },
                        })
                          .then((r) => r.blob())
                          .then((blob) => {
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          });
                      }}
                      className="flex items-center text-xs text-gray-700 hover:underline cursor-pointer"
                      title="Download PDF"
                    >
                      <Download className="w-3 h-3 mr-1" /> PDF
                    </a>
                    <a
                      href={`/api/invoices/${i.id}/ledes`}
                      onClick={(ev) => {
                        ev.preventDefault();
                        fetch(`/api/invoices/${i.id}/ledes`, {
                          headers: { Authorization: `Bearer ${getToken()}` },
                        })
                          .then((r) => r.blob())
                          .then((blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${i.invoice_number}.ledes`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          });
                      }}
                      className="flex items-center text-xs text-gray-700 hover:underline cursor-pointer"
                      title="Download LEDES 1998B for e-billing"
                    >
                      <FileDown className="w-3 h-3 mr-1" /> LEDES
                    </a>
                    {i.status === 'draft' && (
                      <button onClick={() => handleStatusChange(i.id, 'sent')}
                        className="flex items-center text-xs text-blue-700 hover:underline">
                        <Send className="w-3 h-3 mr-1" /> Send
                      </button>
                    )}
                    {['sent', 'partial', 'overdue'].includes(i.status) && (
                      <button onClick={() => setPaymentInvoice(i)}
                        className="flex items-center text-xs text-emerald-700 hover:underline">
                        <DollarSign className="w-3 h-3 mr-1" /> Record payment
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaymentModal
        open={paymentInvoice !== null}
        onClose={() => setPaymentInvoice(null)}
        onSaved={() => {
          setPaymentInvoice(null);
          // Reload invoices to reflect new balance
          apiFetch('/api/invoices').then((r) => r.json()).then(setInvoices);
        }}
        invoice={paymentInvoice}
      />
    </div>
  );
}
