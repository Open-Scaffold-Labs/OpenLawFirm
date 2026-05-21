import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Users, Plus, Search } from 'lucide-react';
import ClientFormModal from '../components/ClientFormModal';

export default function Clients({ onNavigate }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null=closed, {}=new, {id,...}=edit

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await apiFetch(`/api/clients${params}`);
    setClients(await res.json());
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    loadClients();
  }

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

      <form onSubmit={handleSearch} className="mb-4 relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-law-500" />
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Open Matters</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Trust Balance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No clients found</td></tr>
            ) : clients.map(c => (
              <tr key={c.id} onClick={() => setEditing(c)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {c.client_type === 'company' ? c.company_name : `${c.first_name} ${c.last_name}`}
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{c.client_type}</td>
                <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-center">{c.open_matters || 0}</td>
                <td className="px-4 py-3 text-right font-medium">
                  ${parseFloat(c.trust_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ClientFormModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => loadClients()}
        client={editing && editing.id ? editing : null}
      />
    </div>
  );
}
