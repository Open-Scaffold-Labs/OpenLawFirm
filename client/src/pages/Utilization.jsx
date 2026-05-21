import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { BarChart3, TrendingUp, AlertTriangle, Landmark } from 'lucide-react';

const $ = (n) => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const $2 = (n) => '$' + parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Utilization({ onNavigate }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [target, setTarget] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [days, target]);

  async function load() {
    setLoading(true);
    const res = await apiFetch(`/api/analytics/utilization?days=${days}&target_hours=${target}`);
    setData(await res.json());
    setLoading(false);
  }

  if (loading && !data) {
    return <div className="animate-pulse text-gray-400">Loading utilization…</div>;
  }

  if (!data) return null;

  const totalAR = (
    parseFloat(data.ar_aging.current_due) +
    parseFloat(data.ar_aging.overdue_30) +
    parseFloat(data.ar_aging.overdue_60) +
    parseFloat(data.ar_aging.overdue_90_plus)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-law-600" /> Utilization & Realization
        </h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Window:
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </label>
          <label className="text-sm text-gray-600">Target billable / day:
            <input type="number" step="0.5" min="1" max="12"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="ml-2 w-16 border border-gray-300 rounded px-2 py-1 text-sm" />
          </label>
        </div>
      </div>

      {/* Firm-wide cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={TrendingUp} label="Total hours"
          primary={parseFloat(data.firm.total_hours).toFixed(1)}
          secondary={`${parseFloat(data.firm.billable_hours).toFixed(1)} billable`}
        />
        <StatCard
          icon={TrendingUp} label="WIP value"
          primary={$(data.firm.wip_value)}
          secondary="Unbilled billable work"
          tone="emerald"
        />
        <StatCard
          icon={Landmark} label="Trust balance"
          primary={$(data.trust.total_balance)}
          secondary="Active accounts"
          tone="indigo"
        />
        <StatCard
          icon={AlertTriangle} label="Outstanding AR"
          primary={$(totalAR)}
          secondary={
            parseFloat(data.ar_aging.overdue_90_plus) > 0
              ? `${$(data.ar_aging.overdue_90_plus)} 90+ days overdue`
              : `${$(data.ar_aging.overdue_30)} overdue`
          }
          tone="amber"
        />
      </div>

      {/* AR aging buckets */}
      <section className="bg-white rounded-xl border mb-6">
        <header className="px-5 py-3 border-b text-sm font-medium text-gray-900">Accounts Receivable Aging</header>
        <div className="grid grid-cols-4 gap-0 divide-x">
          <ARBucket label="Current" amount={data.ar_aging.current_due} tone="bg-emerald-50 text-emerald-900" />
          <ARBucket label="1–30 days overdue" amount={data.ar_aging.overdue_30} tone="bg-yellow-50 text-yellow-900" />
          <ARBucket label="31–60 days overdue" amount={data.ar_aging.overdue_60} tone="bg-orange-50 text-orange-900" />
          <ARBucket label="61+ days overdue" amount={data.ar_aging.overdue_90_plus} tone="bg-red-50 text-red-900" />
        </div>
      </section>

      {/* Per-attorney utilization */}
      <section className="bg-white rounded-xl border mb-6">
        <header className="px-5 py-3 border-b text-sm font-medium text-gray-900 flex items-center justify-between">
          <span>Per-Attorney Utilization</span>
          <span className="text-xs text-gray-500">
            Target: {data.window.target_hours_per_attorney_per_day}h/day · {Math.round(data.window.target_hours_per_attorney)}h over {data.window.days} days
          </span>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-2">Attorney</th>
              <th className="text-left px-5 py-2">Role</th>
              <th className="text-right px-5 py-2">Total hours</th>
              <th className="text-right px-5 py-2">Billable</th>
              <th className="text-right px-5 py-2">WIP value</th>
              <th className="text-right px-5 py-2">Billed value</th>
              <th className="text-left px-5 py-2 w-48">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {data.per_attorney.map((a) => (
              <tr key={a.user_id} className="border-t hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-5 py-3 capitalize text-gray-600">{a.role}</td>
                <td className="px-5 py-3 text-right">{parseFloat(a.total_hours).toFixed(1)}</td>
                <td className="px-5 py-3 text-right">{parseFloat(a.billable_hours).toFixed(1)}</td>
                <td className="px-5 py-3 text-right font-medium">{$(a.wip_value)}</td>
                <td className="px-5 py-3 text-right text-gray-600">{$(a.billed_value)}</td>
                <td className="px-5 py-3">
                  <UtilBar pct={a.utilization_pct} />
                </td>
              </tr>
            ))}
            {data.per_attorney.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-6 text-center text-gray-400">No time entries in window</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Top matters */}
      <section className="bg-white rounded-xl border">
        <header className="px-5 py-3 border-b text-sm font-medium text-gray-900">Top Matters by Hours</header>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-2">Matter</th>
              <th className="text-left px-5 py-2">Title</th>
              <th className="text-right px-5 py-2">Hours</th>
              <th className="text-right px-5 py-2">WIP value</th>
            </tr>
          </thead>
          <tbody>
            {data.top_matters.map((m) => (
              <tr key={m.id} onClick={() => onNavigate?.('matter-detail', { matterId: m.id })}
                className="border-t hover:bg-gray-50 cursor-pointer">
                <td className="px-5 py-3 font-mono text-law-700 text-xs">{m.matter_number}</td>
                <td className="px-5 py-3 text-gray-900">{m.title}</td>
                <td className="px-5 py-3 text-right">{parseFloat(m.hours).toFixed(1)}</td>
                <td className="px-5 py-3 text-right font-medium">{$(m.wip_value)}</td>
              </tr>
            ))}
            {data.top_matters.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-400">No matter activity in window</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, primary, secondary, tone }) {
  const tones = {
    emerald: 'text-emerald-700',
    indigo: 'text-law-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon className={`w-4 h-4 ${tones[tone] || 'text-gray-400'}`} />
      </div>
      <div className={`text-2xl font-bold mt-1 ${tones[tone] || 'text-gray-900'}`}>{primary}</div>
      <div className="text-xs text-gray-500 mt-1">{secondary}</div>
    </div>
  );
}

function ARBucket({ label, amount, tone }) {
  return (
    <div className={`p-4 ${tone}`}>
      <div className="text-xs uppercase tracking-wide opacity-75">{label}</div>
      <div className="text-xl font-bold mt-1">{$2(amount)}</div>
    </div>
  );
}

function UtilBar({ pct }) {
  if (pct == null) return <span className="text-gray-400 text-xs">—</span>;
  const clamped = Math.min(Math.max(pct, 0), 150);
  let color = 'bg-red-500';
  if (clamped >= 90) color = 'bg-emerald-500';
  else if (clamped >= 70) color = 'bg-law-500';
  else if (clamped >= 50) color = 'bg-amber-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(clamped, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-10 text-right">{pct}%</span>
    </div>
  );
}
