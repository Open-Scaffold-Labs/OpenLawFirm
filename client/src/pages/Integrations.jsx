import React, { useState, useEffect } from 'react';
import { apiFetch } from '../auth';
import {
  Plug, Cloud, FolderOpen, PenTool, Search, Sparkles,
  CheckCircle2, ExternalLink, AlertCircle, Settings as SettingsIcon,
} from 'lucide-react';

// Static config for v0.1. In a future iteration these come from the server
// (a new /api/integrations route reading config rows from olf_settings).
const claudeConnector = {
  name: 'OpenLawFirm Connector for Claude',
  status: 'staging',
  statusLabel: 'Running locally — production deploy pending',
  mcpUrl: 'http://localhost:3825/mcp',
  productionUrl: 'mcp.openlawfirm.openscaffoldlabs.com (pending)',
  directoryStatus: 'Not yet submitted',
  toolCount: 7,
};

const documentStores = [
  { name: 'Built-in (olf_documents)', status: 'active', note: 'Default storage in the shared PostgreSQL schema' },
  { name: 'Box', status: 'available', note: 'CONNECT-native adapter — requires Box developer credentials' },
  { name: 'iManage Work', status: 'available', note: 'CONNECT-native adapter — pending iManage partner program approval' },
  { name: 'NetDocuments', status: 'available', note: 'CONNECT-native adapter — pending ndConnect partner program approval' },
];

const signatureProviders = [
  { name: 'DocuSeal', status: 'configured', note: 'Open-source default. Self-hosted via Docker.' },
  { name: 'DocuSign', status: 'via-claude', note: 'Available through the firm\'s Claude connector — no native integration needed' },
];

const researchProviders = [
  { name: 'Thomson Reuters / CoCounsel (Westlaw)', via: 'Claude' },
  { name: 'LexisNexis Lexis+ / Protégé', via: 'Claude' },
  { name: 'Free Law Project (CourtListener)', via: 'Claude' },
  { name: 'Midpage', via: 'Claude' },
  { name: 'Trellis (state trial-court data)', via: 'Claude' },
  { name: 'Descrybe', via: 'Claude' },
];

const practiceAreaPlugins = [
  { area: 'Litigation', plugin: 'Litigation Legal', pairsWith: 'Matter management, calendar, trust accounting' },
  { area: 'Personal Injury', plugin: 'Litigation Legal', pairsWith: 'Matter management, document engine, trust' },
  { area: 'Family Law', plugin: 'Litigation Legal', pairsWith: 'Matter management, calendar, client portal' },
  { area: 'Commercial / Business', plugin: 'Commercial Legal', pairsWith: 'Document engine, e-sig, matter management' },
  { area: 'Employment', plugin: 'Employment Legal', pairsWith: 'Document engine, matter management, calendar' },
  { area: 'Estate Planning', plugin: 'Commercial Legal + Privacy Legal', pairsWith: 'Document engine, signature' },
  { area: 'IP / Trademark', plugin: 'IP Legal', pairsWith: 'Document engine, calendar' },
  { area: 'Privacy / Compliance', plugin: 'Privacy Legal', pairsWith: 'Document engine, matter management' },
];

function StatusPill({ status }) {
  const styles = {
    staging:    'bg-amber-100  text-amber-800',
    production: 'bg-emerald-100 text-emerald-800',
    active:     'bg-emerald-100 text-emerald-800',
    configured: 'bg-emerald-100 text-emerald-800',
    available:  'bg-slate-100  text-slate-700',
    'via-claude': 'bg-indigo-100 text-indigo-800',
  };
  const labels = {
    staging: 'Staging',
    production: 'Production',
    active: 'Active',
    configured: 'Configured',
    available: 'Available',
    'via-claude': 'Via Claude',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {labels[status] || status}
    </span>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="bg-white rounded-xl border mb-6">
      <header className="px-5 py-4 border-b">
        <div className="flex items-start gap-3">
          <div className="bg-law-50 text-law-700 rounded-lg p-2 flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export default function Integrations() {
  const [healthChecks, setHealthChecks] = useState({});

  useEffect(() => {
    // Best-effort liveness check of the MCP server. Will fail silently if not running.
    fetch('http://localhost:3825/health')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setHealthChecks((prev) => ({ ...prev, mcp: data })))
      .catch(() => setHealthChecks((prev) => ({ ...prev, mcp: { status: 'down' } })));
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Plug className="w-6 h-6 mr-2 text-law-600" /> Integrations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          How OpenLawFirm composes with the Claude for Legal ecosystem.
          Practice management is the system of record; Claude is the universal interface.
        </p>
      </header>

      {/* Claude Connector */}
      <Section
        icon={Cloud}
        title="Claude for Legal Connector"
        description={
          <>
            The <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">openlawfirm-mcp</code> server
            exposes this firm's matter, time, trust, document, invoice, and calendar data to Claude.
            Attorneys with a paid Claude subscription can install it from the Anthropic Connectors Directory
            to drive workflows from natural language.
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
            <div className="mt-1 flex items-center gap-2">
              <StatusPill status={claudeConnector.status} />
              <span className="text-sm text-gray-700">{claudeConnector.statusLabel}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Live health</div>
            <div className="mt-1 text-sm">
              {healthChecks.mcp == null ? (
                <span className="text-gray-400">checking…</span>
              ) : healthChecks.mcp.status === 'ok' ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Reachable on :3825
                </span>
              ) : (
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Not reachable
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Local URL</div>
            <div className="mt-1 text-sm font-mono text-gray-700">{claudeConnector.mcpUrl}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Production URL</div>
            <div className="mt-1 text-sm font-mono text-gray-400">{claudeConnector.productionUrl}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Tools exposed</div>
            <div className="mt-1 text-sm text-gray-700">
              {claudeConnector.toolCount} —
              <span className="text-gray-500">
                {' '}matter_search, matter_get, time_entry_create, document_search,
                invoice_status, trust_balance, calendar_query
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Directory listing</div>
            <div className="mt-1 text-sm text-gray-700">{claudeConnector.directoryStatus}</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center gap-3">
          <a
            href="https://open-scaffold-labs.github.io/OpenLawFirm/connector/"
            target="_blank" rel="noreferrer"
            className="text-sm text-law-700 hover:text-law-900 flex items-center gap-1"
          >
            Public connector docs <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/mcp/SUBMISSION-CHECKLIST.md"
            target="_blank" rel="noreferrer"
            className="text-sm text-law-700 hover:text-law-900 flex items-center gap-1"
          >
            Submission checklist <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </Section>

      {/* Document Storage */}
      <Section
        icon={FolderOpen}
        title="Document Storage"
        description="Where matter documents live. Defaults to the built-in olf_documents table; can attach to an existing DMS for firms that have one."
      >
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase tracking-wide">
            <tr><th className="text-left pb-2">Provider</th><th className="text-left pb-2">Status</th><th className="text-left pb-2">Notes</th></tr>
          </thead>
          <tbody className="divide-y">
            {documentStores.map((d) => (
              <tr key={d.name}>
                <td className="py-2.5 text-gray-900 font-medium">{d.name}</td>
                <td className="py-2.5"><StatusPill status={d.status} /></td>
                <td className="py-2.5 text-gray-600">{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* E-Signature */}
      <Section
        icon={PenTool}
        title="E-Signature"
        description="DocuSeal is the open-source default. Firms using DocuSign reach it through Claude's connector — no native integration on our side."
      >
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase tracking-wide">
            <tr><th className="text-left pb-2">Provider</th><th className="text-left pb-2">Status</th><th className="text-left pb-2">Notes</th></tr>
          </thead>
          <tbody className="divide-y">
            {signatureProviders.map((s) => (
              <tr key={s.name}>
                <td className="py-2.5 text-gray-900 font-medium">{s.name}</td>
                <td className="py-2.5"><StatusPill status={s.status} /></td>
                <td className="py-2.5 text-gray-600">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Legal Research */}
      <Section
        icon={Search}
        title="Legal Research"
        description="We intentionally do not build legal research inside OpenLawFirm. Firms reach Westlaw, LexisNexis, Free Law Project, and others through Claude's connector ecosystem using the firm's existing subscriptions."
      >
        <div className="grid grid-cols-2 gap-2">
          {researchProviders.map((r) => (
            <div key={r.name} className="flex items-center justify-between py-2 px-3 rounded bg-slate-50">
              <span className="text-sm text-gray-900">{r.name}</span>
              <StatusPill status="via-claude" />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Attorneys access these through their own Claude subscription. OpenLawFirm provides the matter
          context (via the openlawfirm-mcp connector); Claude provides the research orchestration.
        </p>
      </Section>

      {/* Practice-Area Plugins */}
      <Section
        icon={Sparkles}
        title="Recommended Claude Plugins by Practice Area"
        description="Anthropic ships 12 practice-area plugins that compose with the OpenLawFirm connector. Install the ones that match your firm's book of business inside your Claude account."
      >
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left pb-2">Practice Area</th>
              <th className="text-left pb-2">Recommended Plugin</th>
              <th className="text-left pb-2">Pairs With</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {practiceAreaPlugins.map((p) => (
              <tr key={p.area}>
                <td className="py-2.5 text-gray-900 font-medium">{p.area}</td>
                <td className="py-2.5 text-law-700">{p.plugin}</td>
                <td className="py-2.5 text-gray-600 text-xs">{p.pairsWith}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <a
          href="https://github.com/anthropics/claude-for-legal"
          target="_blank" rel="noreferrer"
          className="text-sm text-law-700 hover:text-law-900 flex items-center gap-1 mt-4"
        >
          Claude for Legal plugin source <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Section>

      <footer className="text-xs text-gray-500 mt-8 pb-4">
        Integration architecture per{' '}
        <a href="https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/INTEGRATIONS.md"
           target="_blank" rel="noreferrer" className="text-law-700 hover:underline">INTEGRATIONS.md</a>.
        BUILD / CONNECT / EXPOSE framework documented at{' '}
        <a href="https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/IMPLEMENTATION.md"
           target="_blank" rel="noreferrer" className="text-law-700 hover:underline">IMPLEMENTATION.md</a>.
      </footer>
    </div>
  );
}
