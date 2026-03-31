import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Briefcase, Clock, DollarSign, Landmark, AlertTriangle, CalendarDays } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/dashboard').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-gray-400">Loading dashboard...</div>;
  if (!data) return <div className="text-red-500">Failed to load dashboard</div>;

  const openMatters = data.matters?.find(m => m.status === 'open')?.count || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Briefcase} label="Open Matters" value={openMatters} color="law"
          onClick={() => onNavigate('matters')} />
        <StatCard icon={Clock} label="Billable Hours (30d)" value={parseFloat(data.billing?.billable_hours || 0).toFixed(1)}
          color="blue" onClick={() => onNavigate('time-entry')} />
        <StatCard icon={DollarSign} label="Billable Value (30d)"
          value={`$${parseFloat(data.billing?.billable_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          color="green" onClick={() => onNavigate('billing')} />
        <StatCard icon={Landmark} label="Trust Balance"
          value={`$${parseFloat(data.trust_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          color="amber" onClick={() => onNavigate('trust')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-law-600" /> Upcoming Deadlines
            </h2>
            <button onClick={() => onNavigate('calendar')} className="text-sm text-law-600 hover:underline">View all</button>
          </div>
          {data.upcoming_deadlines?.length === 0 && <p className="text-gray-400 text-sm">No upcoming deadlines</p>}
          <div className="space-y-3">
            {data.upcoming_deadlines?.map(d => (
              <div key={d.id} className="flex items-start justify-between text-sm border-b border-gray-100 pb-2">
                <div>
                  <div className="font-medium text-gray-900">{d.title}</div>
                  <div className="text-gray-500">{d.matter_number} — {d.matter_title}</div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className={`font-medium ${d.is_court_date ? 'text-red-600' : 'text-gray-700'}`}>
                    {new Date(d.start_time).toLocaleDateString()}
                  </div>
                  {d.is_court_date && (
                    <span className="inline-flex items-center text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Court
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent time entries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" /> Recent Time Entries
            </h2>
            <button onClick={() => onNavigate('time-entry')} className="text-sm text-law-600 hover:underline">View all</button>
          </div>
          {data.recent_entries?.length === 0 && <p className="text-gray-400 text-sm">No recent entries</p>}
          <div className="space-y-3">
            {data.recent_entries?.slice(0, 8).map(e => (
              <div key={e.id} className="flex items-start justify-between text-sm border-b border-gray-100 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{e.description}</div>
                  <div className="text-gray-500">{e.full_name} — {e.matter_number}</div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="font-medium text-gray-900">{parseFloat(e.hours).toFixed(1)}h</div>
                  <div className="text-gray-500 text-xs">${(parseFloat(e.hours) * parseFloat(e.rate)).toFixed(0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  const colorMap = {
    law: 'bg-law-50 text-law-700 border-law-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <button onClick={onClick}
      className={`rounded-xl border p-4 text-left transition hover:shadow-md ${colorMap[color]}`}>
      <Icon className="w-6 h-6 mb-2 opacity-70" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-70">{label}</div>
    </button>
  );
}
