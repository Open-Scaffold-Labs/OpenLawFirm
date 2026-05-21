import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Clock, Plus, Check, Trash2, Pencil } from 'lucide-react';
import TimeEntryFormModal from '../components/TimeEntryFormModal';

export default function TimeEntry({ onNavigate, selectedMatter }) {
  const [entries, setEntries] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=closed, {}=new, {id,...}=edit

  useEffect(() => { reload(); }, []);

  async function reload() {
    setLoading(true);
    const [e, s] = await Promise.all([
      apiFetch('/api/time-entries').then((r) => r.json()),
      apiFetch('/api/time-entries/summary/today').then((r) => r.json()).catch(() => null),
    ]);
    setEntries(e);
    setTodaySummary(s);
    setLoading(false);
  }

  async function handleApprove(id) {
    const res = await apiFetch('/api/time-entries/approve', {
      method: 'POST',
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) reload();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this time entry?')) return;
    const res = await apiFetch(`/api/time-entries/${id}`, { method: 'DELETE' });
    if (res.ok) reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Clock className="w-6 h-6 mr-2 text-law-600" /> Time & Billing
        </h1>
        <button onClick={() => setEditing({})}
          className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Entry
        </button>
      </div>

      {/* Today's summary */}
      {todaySummary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Today's Hours</div>
            <div className="text-xl font-bold">{parseFloat(todaySummary.total_hours || 0).toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Billable Hours</div>
            <div className="text-xl font-bold text-green-700">{parseFloat(todaySummary.billable_hours || 0).toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Billable Value</div>
            <div className="text-xl font-bold text-green-700">${parseFloat(todaySummary.billable_value || 0).toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Entries Today</div>
            <div className="text-xl font-bold">{todaySummary.entry_count || 0}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Matter</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Timekeeper</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Hours</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">No time entries yet</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(e.entry_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-law-700 text-xs">{e.matter_number}</td>
                <td className="px-4 py-3">{e.name || e.full_name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.activity_code || '—'}</td>
                <td className="px-4 py-3 text-gray-700 max-w-md truncate" title={e.description}>{e.description}</td>
                <td className="px-4 py-3 text-right">{parseFloat(e.hours).toFixed(1)}</td>
                <td className="px-4 py-3 text-right font-medium">${(parseFloat(e.hours) * parseFloat(e.rate)).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.status === 'approved' ? 'bg-green-100 text-green-800' :
                    e.status === 'billed' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>{e.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {e.status === 'draft' && (
                      <>
                        <button onClick={() => handleApprove(e.id)}
                          title="Approve" className="text-green-700 hover:text-green-900">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing(e)}
                          title="Edit" className="text-gray-500 hover:text-gray-800">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(e.id)}
                          title="Delete" className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TimeEntryFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={reload}
        entry={editing && editing.id ? editing : null}
        defaultMatterId={selectedMatter}
      />
    </div>
  );
}
