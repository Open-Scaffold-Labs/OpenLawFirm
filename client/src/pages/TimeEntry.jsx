import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Clock, Plus, Play, Square, Check } from 'lucide-react';

export default function TimeEntry({ onNavigate, selectedMatter }) {
  const [entries, setEntries] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ matter_id: selectedMatter || '', hours: '', description: '', activity_code: '', billable: true });

  useEffect(() => {
    Promise.all([
      apiFetch('/api/time-entries').then(r => r.json()),
      apiFetch('/api/time-entries/summary/today').then(r => r.json()),
      apiFetch('/api/matters?status=open').then(r => r.json()),
    ]).then(([e, s, m]) => {
      setEntries(e);
      setTodaySummary(s);
      setMatters(m);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await apiFetch('/api/time-entries', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newEntry = await res.json();
      setEntries([newEntry, ...entries]);
      setShowForm(false);
      setForm({ matter_id: '', hours: '', description: '', activity_code: '', billable: true });
      // Refresh summary
      const s = await apiFetch('/api/time-entries/summary/today').then(r => r.json());
      setTodaySummary(s);
    }
  }

  async function handleApprove(ids) {
    const res = await apiFetch('/api/time-entries/approve', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const data = await res.json();
      setEntries(entries.map(e => data.entries.find(a => a.id === e.id) || e));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Clock className="w-6 h-6 mr-2 text-law-600" /> Time & Billing
        </h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Entry
        </button>
      </div>

      {/* Today's summary */}
      {todaySummary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Today's Hours</div>
            <div className="text-xl font-bold">{parseFloat(todaySummary.total_hours).toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Billable Hours</div>
            <div className="text-xl font-bold text-green-700">{parseFloat(todaySummary.billable_hours).toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Billable Value</div>
            <div className="text-xl font-bold text-green-700">${parseFloat(todaySummary.billable_value).toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-sm text-gray-500">Entries Today</div>
            <div className="text-xl font-bold">{todaySummary.entry_count}</div>
          </div>
        </div>
      )}

      {/* New entry form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matter</label>
              <select value={form.matter_id} onChange={e => setForm({ ...form, matter_id: e.target.value })} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-law-500">
                <option value="">Select matter...</option>
                {matters.map(m => <option key={m.id} value={m.id}>{m.matter_number} — {m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours (6-min increments)</label>
              <input type="number" step="0.1" min="0.1" value={form.hours}
                onChange={e => setForm({ ...form, hours: e.target.value })} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-law-500"
                placeholder="1.5" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-law-500"
              placeholder="Describe work performed..." />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-700">
              <input type="checkbox" checked={form.billable} onChange={e => setForm({ ...form, billable: e.target.checked })}
                className="mr-2 rounded" /> Billable
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit"
                className="bg-law-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-law-700">Save Entry</button>
            </div>
          </div>
        </form>
      )}

      {/* Entries table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Matter</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Timekeeper</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Hours</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No time entries yet</td></tr>
            ) : entries.map(e => (
              <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">{new Date(e.entry_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-law-700 text-xs">{e.matter_number}</td>
                <td className="px-4 py-3">{e.full_name}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{e.description}</td>
                <td className="px-4 py-3 text-right">{parseFloat(e.hours).toFixed(1)}</td>
                <td className="px-4 py-3 text-right font-medium">${(parseFloat(e.hours) * parseFloat(e.rate)).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {e.status === 'draft' ? (
                    <button onClick={() => handleApprove([e.id])}
                      className="flex items-center text-xs text-green-700 hover:underline">
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </button>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      e.status === 'approved' ? 'bg-green-100 text-green-800' :
                      e.status === 'billed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{e.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
