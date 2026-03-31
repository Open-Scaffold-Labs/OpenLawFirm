import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Briefcase, Plus, Search, Filter } from 'lucide-react';

export default function Matters({ onNavigate }) {
  const [matters, setMatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadMatters();
  }, [statusFilter]);

  async function loadMatters() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    const res = await apiFetch(`/api/matters?${params}`);
    setMatters(await res.json());
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    loadMatters();
  }

  const statusColors = {
    open: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    on_hold: 'bg-orange-100 text-orange-800',
  };

  const billingLabels = {
    hourly: 'Hourly',
    flat_fee: 'Flat Fee',
    contingency: 'Contingency',
    retainer: 'Retainer',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Briefcase className="w-6 h-6 mr-2 text-law-600" /> Matters
        </h1>
        <button className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Matter
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search matters..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-law-500" />
        </form>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-law-500">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="pending">Pending</option>
          <option value="on_hold">On Hold</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Matter #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Practice Area</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Billing</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Attorney</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Billed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : matters.length === 0 ? (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">No matters found</td></tr>
            ) : matters.map(m => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => onNavigate('matter-detail', { matterId: m.id })}>
                <td className="px-4 py-3 font-mono text-law-700">{m.matter_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{m.title}</td>
                <td className="px-4 py-3 text-gray-600">
                  {m.company_name || `${m.client_first || ''} ${m.client_last || ''}`}
                </td>
                <td className="px-4 py-3 text-gray-600">{m.practice_area_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{billingLabels[m.billing_type] || m.billing_type}</td>
                <td className="px-4 py-3 text-gray-600">{m.attorney_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[m.status] || 'bg-gray-100 text-gray-600'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  ${parseFloat(m.total_billed || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
