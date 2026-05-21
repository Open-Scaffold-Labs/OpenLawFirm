import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { ArrowLeft, Briefcase, Clock, FileText, Users, DollarSign, Pencil, Plus, Trash2 } from 'lucide-react';
import MatterFormModal from '../components/MatterFormModal';
import ExpenseFormModal from '../components/ExpenseFormModal';
import ContactFormModal from '../components/ContactFormModal';
import DocumentFormModal from '../components/DocumentFormModal';

export default function MatterDetail({ matterId, onNavigate }) {
  const [matter, setMatter] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [addingDocument, setAddingDocument] = useState(false);

  async function reloadMatter() {
    const m = await apiFetch(`/api/matters/${matterId}`).then((r) => r.json());
    setMatter(m);
  }

  async function reloadAll() {
    const [m, te, ex, co, dc] = await Promise.all([
      apiFetch(`/api/matters/${matterId}`).then((r) => r.json()),
      apiFetch(`/api/matters/${matterId}/time-entries`).then((r) => r.json()),
      apiFetch(`/api/matters/${matterId}/expenses`).then((r) => r.json()),
      apiFetch(`/api/matters/${matterId}/contacts`).then((r) => r.json()),
      apiFetch(`/api/matters/${matterId}/documents`).then((r) => r.json()),
    ]);
    setMatter(m);
    setTimeEntries(te);
    setExpenses(ex);
    setContacts(co);
    setDocuments(dc);
  }

  async function handleDeleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    const res = await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) reloadAll();
    else alert((await res.json()).error || 'Failed to delete');
  }

  async function handleDeleteContact(id) {
    if (!confirm('Remove this contact from the matter?')) return;
    const res = await apiFetch(`/api/matters/${matterId}/contacts/${id}`, { method: 'DELETE' });
    if (res.ok) reloadAll();
  }

  async function handleDeleteDocument(id) {
    if (!confirm('Remove this document from the matter? (Metadata only — does not delete the file in the underlying DMS.)')) return;
    const res = await apiFetch(`/api/matters/${matterId}/documents/${id}`, { method: 'DELETE' });
    if (res.ok) reloadAll();
  }

  useEffect(() => {
    if (!matterId) return;
    setLoading(true);
    reloadAll().finally(() => setLoading(false));
  }, [matterId]);

  if (loading) return <div className="animate-pulse text-gray-400">Loading matter...</div>;
  if (!matter) return <div className="text-red-500">Matter not found</div>;

  const totalFees = timeEntries.reduce((s, e) => s + parseFloat(e.hours) * parseFloat(e.rate), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalHours = timeEntries.reduce((s, e) => s + parseFloat(e.hours), 0);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Briefcase },
    { key: 'time', label: 'Time Entries', icon: Clock },
    { key: 'expenses', label: 'Expenses', icon: DollarSign },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'contacts', label: 'Contacts', icon: Users },
  ];

  return (
    <div>
      <button onClick={() => onNavigate('matters')} className="flex items-center text-sm text-law-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Matters
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{matter.title}</h1>
          <div className="text-gray-500 mt-1">
            {matter.matter_number} · {matter.practice_area_name} · {matter.attorney_name}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            matter.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>{matter.status}</span>
          <button onClick={() => setEditing(true)}
            className="flex items-center text-sm text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-lg border border-gray-300">
            <Pencil className="w-4 h-4 mr-1" /> Edit
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-xl font-bold">{totalHours.toFixed(1)}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Fees</div>
          <div className="text-xl font-bold">${totalFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Expenses</div>
          <div className="text-xl font-bold">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Billing Type</div>
          <div className="text-xl font-bold capitalize">{matter.billing_type?.replace('_', ' ')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center pb-3 text-sm border-b-2 transition ${
                tab === t.key ? 'border-law-600 text-law-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <t.icon className="w-4 h-4 mr-1.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          {matter.court_name && <Field label="Court" value={matter.court_name} />}
          {matter.case_number && <Field label="Case Number" value={matter.case_number} />}
          {matter.opposing_party && <Field label="Opposing Party" value={matter.opposing_party} />}
          {matter.opposing_counsel && <Field label="Opposing Counsel" value={matter.opposing_counsel} />}
          {matter.statute_of_limitations && <Field label="Statute of Limitations" value={new Date(matter.statute_of_limitations).toLocaleDateString()} />}
          {matter.notes && <Field label="Notes" value={matter.notes} />}
          <Field label="Opened" value={new Date(matter.date_opened).toLocaleDateString()} />
          {matter.client_email && <Field label="Client Email" value={matter.client_email} />}
        </div>
      )}

      {tab === 'time' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Timekeeper</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Hours</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Rate</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map(e => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{new Date(e.entry_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{e.full_name}</td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{e.description}</td>
                  <td className="px-4 py-3 text-right">{parseFloat(e.hours).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">${parseFloat(e.rate).toFixed(0)}</td>
                  <td className="px-4 py-3 text-right font-medium">${(parseFloat(e.hours) * parseFloat(e.rate)).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      e.status === 'approved' ? 'bg-green-100 text-green-800' :
                      e.status === 'billed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expenses' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setEditingExpense({})}
              className="bg-law-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-law-700 flex items-center">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add expense
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No expenses recorded</td></tr>
                ) : expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{e.description}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{(e.category || '').replace(/_/g, ' ') || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">${parseFloat(e.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        e.status === 'approved' ? 'bg-green-100 text-green-800' :
                        e.status === 'billed' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!e.billed_on_invoice_id && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditingExpense(e)} title="Edit"
                            className="text-gray-500 hover:text-gray-800">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteExpense(e.id)} title="Delete"
                            className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setAddingDocument(true)}
              className="bg-law-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-law-700 flex items-center">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add document
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Filename</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded by</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No documents yet</td></tr>
                ) : documents.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{d.file_name}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{(d.doc_category || 'general').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-500 uppercase text-xs">{d.file_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{d.uploaded_by_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteDocument(d.id)} title="Remove"
                        className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setEditingContact({})}
              className="bg-law-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-law-700 flex items-center">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add contact
            </button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Firm / Org</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">No contacts yet</td></tr>
                ) : contacts.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 capitalize text-gray-700">{(c.contact_type || '').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.firm_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingContact(c)} title="Edit"
                          className="text-gray-500 hover:text-gray-800">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteContact(c.id)} title="Remove"
                          className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MatterFormModal
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); reloadMatter(); }}
        matter={matter}
      />
      <ExpenseFormModal
        open={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
        onSaved={reloadAll}
        expense={editingExpense && editingExpense.id ? editingExpense : null}
        defaultMatterId={matterId}
      />
      <ContactFormModal
        open={editingContact !== null}
        onClose={() => setEditingContact(null)}
        onSaved={reloadAll}
        matterId={matterId}
        contact={editingContact && editingContact.id ? editingContact : null}
      />
      <DocumentFormModal
        open={addingDocument}
        onClose={() => setAddingDocument(false)}
        onSaved={reloadAll}
        matterId={matterId}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}
