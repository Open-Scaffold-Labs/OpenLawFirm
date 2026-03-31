import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { CalendarDays, Plus, AlertTriangle, Gavel } from 'lucide-react';

export default function Calendar({ onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadEvents();
  }, [filter]);

  async function loadEvents() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('event_type', filter);
    const res = await apiFetch(`/api/calendar?${params}`);
    setEvents(await res.json());
    setLoading(false);
  }

  const typeIcons = {
    hearing: Gavel,
    deadline: AlertTriangle,
    meeting: CalendarDays,
  };

  const typeColors = {
    hearing: 'bg-red-100 text-red-800 border-red-200',
    deadline: 'bg-amber-100 text-amber-800 border-amber-200',
    meeting: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <CalendarDays className="w-6 h-6 mr-2 text-law-600" /> Calendar & Deadlines
        </h1>
        <button className="bg-law-600 text-white px-4 py-2 rounded-lg hover:bg-law-700 transition flex items-center text-sm">
          <Plus className="w-4 h-4 mr-1" /> New Event
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {['', 'hearing', 'deadline', 'meeting'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
              filter === f ? 'bg-law-600 text-white border-law-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}>{f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}</button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-gray-400">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No events found</div>
        ) : events.map(e => {
          const Icon = typeIcons[e.event_type] || CalendarDays;
          return (
            <div key={e.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${
              e.is_court_date ? 'border-red-200' : 'border-gray-200'
            }`}>
              <div className={`rounded-lg p-2.5 ${typeColors[e.event_type] || 'bg-gray-100 text-gray-600'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{e.title}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {e.matter_number && <span className="font-mono mr-2">{e.matter_number}</span>}
                  {e.matter_title}
                </div>
                {e.location && <div className="text-sm text-gray-500 mt-0.5">{e.location}</div>}
                {e.description && <div className="text-sm text-gray-400 mt-1">{e.description}</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-medium text-gray-900">
                  {new Date(e.start_time).toLocaleDateString()}
                </div>
                {!e.all_day && (
                  <div className="text-sm text-gray-500">
                    {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {e.is_court_date && (
                  <span className="inline-flex items-center text-xs text-red-600 mt-1">
                    <Gavel className="w-3 h-3 mr-1" /> Court Date
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
