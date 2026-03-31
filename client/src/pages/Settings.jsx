import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/settings').then(r => r.json()).then(setSettings).finally(() => setLoading(false));
  }, []);

  async function handleSave(key, value) {
    setSaving(true);
    await apiFetch(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
    setSaving(false);
  }

  function updateSetting(key, value) {
    setSettings({ ...settings, [key]: value });
  }

  if (loading) return <div className="animate-pulse text-gray-400">Loading settings...</div>;

  const fields = [
    { key: 'firm_name', label: 'Firm Name', type: 'text' },
    { key: 'billing_increment', label: 'Billing Increment (minutes)', type: 'number' },
    { key: 'default_payment_terms', label: 'Default Payment Terms (days)', type: 'number' },
    { key: 'invoice_prefix', label: 'Invoice Number Prefix', type: 'text' },
    { key: 'matter_prefix', label: 'Matter Number Prefix', type: 'text' },
    { key: 'ledes_enabled', label: 'LEDES Billing Format', type: 'toggle' },
    { key: 'trust_reconciliation_frequency', label: 'Trust Reconciliation Frequency', type: 'select',
      options: ['daily', 'weekly', 'monthly'] },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-6">
        <SettingsIcon className="w-6 h-6 mr-2 text-law-600" /> Firm Settings
      </h1>

      <div className="bg-white rounded-xl border divide-y">
        {fields.map(f => (
          <div key={f.key} className="flex items-center justify-between px-5 py-4">
            <label className="text-sm font-medium text-gray-700 w-64">{f.label}</label>
            <div className="flex items-center gap-3">
              {f.type === 'text' && (
                <input type="text" value={settings[f.key] || ''}
                  onChange={e => updateSetting(f.key, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-law-500" />
              )}
              {f.type === 'number' && (
                <input type="number" value={settings[f.key] || ''}
                  onChange={e => updateSetting(f.key, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-law-500" />
              )}
              {f.type === 'toggle' && (
                <button onClick={() => {
                  const newVal = settings[f.key] === 'true' ? 'false' : 'true';
                  updateSetting(f.key, newVal);
                  handleSave(f.key, newVal);
                }}
                  className={`w-12 h-6 rounded-full transition ${settings[f.key] === 'true' ? 'bg-law-600' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    settings[f.key] === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              )}
              {f.type === 'select' && (
                <select value={settings[f.key] || ''} onChange={e => updateSetting(f.key, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-law-500">
                  {f.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              )}
              {f.type !== 'toggle' && (
                <button onClick={() => handleSave(f.key, settings[f.key])}
                  className="text-law-600 hover:text-law-700 transition" title="Save">
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
        <p className="font-medium text-gray-700 mb-1">Demo Credentials</p>
        <p>Username: <code className="bg-gray-200 px-1 rounded">attorney</code> · Password: <code className="bg-gray-200 px-1 rounded">lawfirm1234</code></p>
        <p>Username: <code className="bg-gray-200 px-1 rounded">associate</code> · Password: <code className="bg-gray-200 px-1 rounded">lawfirm1234</code></p>
        <p>Username: <code className="bg-gray-200 px-1 rounded">paralegal</code> · Password: <code className="bg-gray-200 px-1 rounded">lawfirm1234</code></p>
      </div>
    </div>
  );
}
