import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Briefcase, Plus } from 'lucide-react';
import DataTable from '@openscaffold/core/components/DataTable';
import MatterFormModal from '../components/MatterFormModal';

const STATUS_TONES = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
};

const STATUS_OPTIONS = ['', 'open', 'pending', 'on_hold', 'closed'];

export default function Matters({ onNavigate }) {
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadMatters(); }, [statusFilter]);

  async function loadMatters() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const res = await apiFetch(`/api/matters?${params}`);
    setMatters(await res.json());
    setLoading(false);
  }

  // Project a clean row shape for the table.
  const rows = matters.map((m) => ({
    id: m.id,
    matter_number: m.matter_number,
    title: m.title,
    client: m.company_name || `${m.client_first || ''} ${m.client_last || ''}`.trim(),
    practice_area: m.practice_area_name,
    responsible_attorney: m.attorney_name,
    status: m.status,
    date_opened: m.date_opened,
    total_billed: parseFloat(m.total_billed || 0),
    total_hours: parseFloat(m.total_hours || 0),
    raw: m,
  }));

  const columns = [
    { key: 'matter_number', label: 'Matter #', render: (v) => <span className="font-mono text-law-700 text-xs">{v}</span> },
    { key: 'title', label: 'Title', render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'client', label: 'Client' },
    { key: 'practice_area', label: 'Practice area' },
    { key: 'responsible_attorney', label: 'Attorney' },
    { key: 'date_opened', label: 'Opened',
      render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'total_hours', label: 'Hours', align: 'right',
      render: (v) => v ? v.toFixed(1) : '—' },
    { key: 'total_billed', label: 'Billed', align: 'right',
      render: (v) => v ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '—' },
    { key: 'status', label: 'Status', sortable: true,
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_TONES[v] || 'bg-gray-100 text-gray-700'}`}>
          {(v || '').replace(/_/g, ' ')}
        </span>
      ) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Briefcase className="w-6 h-6 mr-2 text-law-600" /> Matters
        </h1>
        <button onClick={() => setShowForm(true)}
          className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Matter
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {STATUS_OPTIONS.map((s) => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition capitalize ${
              statusFilter === s
                ? 'bg-law-600 text-white border-law-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading matters…</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchable
          searchFields={['matter_number', 'title', 'client', 'practice_area', 'responsible_attorney']}
          pageSize={25}
          striped={false}
          emptyMessage="No matters found"
          onRowClick={(row) => onNavigate?.('matter-detail', { matterId: row.id })}
        />
      )}

      <MatterFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={() => loadMatters()}
      />
    </div>
  );
}
