import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import { Landmark, Plus, AlertTriangle, CheckCircle } from 'lucide-react';

export default function TrustAccounting({ onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [clientLedger, setClientLedger] = useState([]);
  const [reconciliation, setReconciliation] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/trust/accounts').then(r => r.json()),
      apiFetch('/api/trust/transactions').then(r => r.json()),
      apiFetch('/api/trust/client-ledger').then(r => r.json()),
      apiFetch('/api/trust/reconciliation').then(r => r.json()),
    ]).then(([a, t, cl, r]) => {
      setAccounts(a);
      setTransactions(t);
      setClientLedger(cl);
      setReconciliation(r);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-gray-400">Loading trust accounts...</div>;

  const tabs = [
    { key: 'overview', label: 'Accounts' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'ledger', label: 'Client Ledger' },
    { key: 'reconciliation', label: 'Three-Way Reconciliation' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Landmark className="w-6 h-6 mr-2 text-law-600" /> Trust / IOLTA Accounts
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm border-b-2 transition ${
                tab === t.key ? 'border-law-600 text-law-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Accounts overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {accounts.map(a => (
            <div key={a.id} className="bg-white rounded-xl border p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{a.account_name}</div>
                <div className="text-sm text-gray-500">{a.bank_name} · {a.account_number}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ${parseFloat(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Matter</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">{new Date(t.transaction_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 capitalize">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      t.transaction_type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{t.transaction_type}</span>
                  </td>
                  <td className="px-4 py-3">{t.client_first} {t.client_last}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.matter_number}</td>
                  <td className="px-4 py-3 text-gray-700">{t.description}</td>
                  <td className={`px-4 py-3 text-right font-medium ${parseFloat(t.amount) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${Math.abs(parseFloat(t.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right">${parseFloat(t.running_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client ledger */}
      {tab === 'ledger' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Matter</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Account</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {clientLedger.map(cl => (
                <tr key={cl.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">{cl.client_first} {cl.client_last}</td>
                  <td className="px-4 py-3">{cl.matter_number} — {cl.matter_title}</td>
                  <td className="px-4 py-3 text-gray-600">{cl.account_name}</td>
                  <td className="px-4 py-3 text-right font-medium">${parseFloat(cl.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(cl.last_updated).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Three-way reconciliation */}
      {tab === 'reconciliation' && (
        <div className="space-y-4">
          {reconciliation.map((r, i) => (
            <div key={i} className={`bg-white rounded-xl border p-5 ${r.balanced ? 'border-green-200' : 'border-red-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{r.account}</h3>
                {r.balanced ? (
                  <span className="flex items-center text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" /> Balanced
                  </span>
                ) : (
                  <span className="flex items-center text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-1" /> Variance: ${r.variance?.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Bank Balance</div>
                  <div className="text-lg font-bold">${r.bank_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Client Ledger Total</div>
                  <div className="text-lg font-bold">${r.client_ledger_total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 uppercase mb-1">Transaction Net</div>
                  <div className="text-lg font-bold">${r.transaction_net?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
