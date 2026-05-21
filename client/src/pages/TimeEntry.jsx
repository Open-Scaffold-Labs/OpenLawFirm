import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Clock, Plus, Check, Trash2, Pencil, CheckSquare } from 'lucide-react';
import DataTable from '@openscaffold/core/components/DataTable';
import TimeEntryFormModal from '../components/TimeEntryFormModal';

const STATUS_TONES = {
  draft: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  billed: 'bg-blue-100 text-blue-800',
};

export default function TimeEntry({ onNavigate, selectedMatter }) {
  const [entries, setEntries] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(new Set());

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

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const draftIds = entries.filter((e) => e.status === 'draft').map((e) => e.id);
  const allDraftsSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));

  function toggleSelectAllDrafts() {
    setSelected(allDraftsSelected ? new Set() : new Set(draftIds));
  }

  async function bulkApprove() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const res = await apiFetch('/api/time-entries/approve', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setSelected(new Set());
      reload();
    }
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

  const rows = entries.map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    matter_number: e.matter_number,
    name: e.name || e.full_name,
    activity_code: e.activity_code,
    description: e.description,
    hours: parseFloat(e.hours),
    amount: parseFloat(e.hours) * parseFloat(e.rate),
    status: e.status,
    raw: e,
  }));

  const columns = [
    { key: 'select', sortable: false, width: 36,
      label: (
        <input type="checkbox" checked={allDraftsSelected}
          onChange={toggleSelectAllDrafts}
          onClick={(ev) => ev.stopPropagation()}
          title="Select all draft entries"
          className="rounded cursor-pointer" />
      ),
      render: (_, row) => row.status === 'draft' ? (
        <input type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(ev) => ev.stopPropagation()}
          className="rounded cursor-pointer" />
      ) : null },
    { key: 'entry_date', label: 'Date',
      render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'matter_number', label: 'Matter',
      render: (v) => <span className="font-mono text-law-700 text-xs">{v}</span> },
    { key: 'name', label: 'Timekeeper', render: (v) => v || '—' },
    { key: 'activity_code', label: 'Code',
      render: (v) => v ? <span className="font-mono text-xs text-gray-500">{v}</span> : '—' },
    { key: 'description', label: 'Description',
      render: (v) => <span className="text-gray-700 line-clamp-1 max-w-md" title={v}>{v}</span> },
    { key: 'hours', label: 'Hours', align: 'right', render: (v) => v.toFixed(1) },
    { key: 'amount', label: 'Amount', align: 'right',
      render: (v) => <span className="font-medium">${v.toFixed(2)}</span> },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_TONES[v] || 'bg-gray-100 text-gray-700'}`}>{v}</span>
    ) },
    { key: 'actions', label: 'Actions', sortable: false,
      render: (_, row) => row.status !== 'draft' ? null : (
        <div className="flex items-center justify-end gap-2" onClick={(ev) => ev.stopPropagation()}>
          <button onClick={() => handleApprove(row.id)} title="Approve"
            className="text-green-700 hover:text-green-900"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditing(row.raw)} title="Edit"
            className="text-gray-500 hover:text-gray-800"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row.id)} title="Delete"
            className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
      align: 'right' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Clock className="w-6 h-6 mr-2 text-law-600" /> Time & Billing
        </h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkApprove}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition flex items-center text-sm">
              <CheckSquare className="w-4 h-4 mr-1" /> Approve {selected.size} selected
            </button>
          )}
          <button onClick={() => setEditing({})}
            className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
            <Plus className="w-4 h-4 mr-1" /> New Entry
          </button>
        </div>
      </div>

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

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading time entries…</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchable
          searchFields={['matter_number', 'name', 'description', 'activity_code']}
          pageSize={50}
          emptyMessage="No time entries yet"
        />
      )}

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
