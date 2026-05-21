import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Users, Plus } from 'lucide-react';
import DataTable from '@openscaffold/core/components/DataTable';
import ClientFormModal from '../components/ClientFormModal';

export default function Clients({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    const res = await apiFetch('/api/clients');
    setClients(await res.json());
    setLoading(false);
  }

  const rows = clients.map((c) => ({
    id: c.id,
    name: c.client_type === 'company'
      ? c.company_name
      : `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    client_type: c.client_type,
    email: c.email,
    phone: c.phone,
    open_matters: parseInt(c.open_matters || 0),
    trust_balance: parseFloat(c.trust_balance || 0),
    status: c.status,
    raw: c,
  }));

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'client_type', label: 'Type',
      render: (v) => <span className="capitalize text-gray-600">{v}</span> },
    { key: 'email', label: 'Email', render: (v) => v || '—' },
    { key: 'phone', label: 'Phone', render: (v) => v || '—' },
    { key: 'open_matters', label: 'Open matters', align: 'center' },
    { key: 'trust_balance', label: 'Trust balance', align: 'right',
      render: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { key: 'status', label: 'Status',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>{v}</span>
      ) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="w-6 h-6 mr-2 text-law-600" /> Clients
        </h1>
        <button onClick={() => setEditing({})}
          className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Client
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading clients…</div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchable
          searchFields={['name', 'email', 'phone']}
          pageSize={25}
          emptyMessage="No clients yet"
          onRowClick={(row) => setEditing(row.raw)}
        />
      )}

      <ClientFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => loadClients()}
        client={editing && editing.id ? editing : null}
      />
    </div>
  );
}
