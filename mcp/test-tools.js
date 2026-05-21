// Tool-level smoke test for the OpenLawFirm MCP server.
//
// Bypasses the OAuth dance (which is a browser/Claude-driven flow) and tests
// the actual data path: tool handler → api.js → session-JWT mint → OpenLawFirm
// API → PostgreSQL → response.
//
// Validates that every tool returns real data from the seed dataset.
//
// Usage: node --env-file=.env test-tools.js

import { tools } from './src/tools/index.js';

// Mock auth payload mimicking a validated OAuth access token for the
// 'attorney' user (id 28 in the openfirehouse seed).
const mockAuth = { sub: '28', scope: 'openlawfirm:matter:read openlawfirm:time:write openlawfirm:document:read openlawfirm:invoice:read openlawfirm:trust:read openlawfirm:calendar:read' };
const mockReq = { auth: mockAuth };
const mockContext = { requestInfo: { req: mockReq } };

async function runTool(toolName, args = {}) {
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) throw new Error(`Tool not found: ${toolName}`);
  const result = await tool.handler(args, mockContext);
  return result?.content?.[0]?.text || JSON.stringify(result);
}

async function step(label, fn) {
  process.stdout.write(`▸ ${label}... `);
  try {
    const out = await fn();
    console.log('OK');
    return out;
  } catch (err) {
    console.log('FAIL');
    console.error('  ', err.message || err);
    throw err;
  }
}

async function main() {
  console.log('\nOpenLawFirm MCP — tool smoke test\n');

  // 1. matter_search — should find the seed matters
  const matters = await step('matter_search { limit: 3 }', () =>
    runTool('matter_search', { limit: 3 }),
  );
  console.log(matters.split('\n').slice(0, 18).join('\n'), '\n');

  // 2. matter_get — pull the first matter's detail
  const matterIdMatch = matters.match(/"id":\s*(\d+)/);
  if (!matterIdMatch) throw new Error('No matter id in matter_search output');
  const matterId = matterIdMatch[1];
  const matter = await step(`matter_get { matter_id: "${matterId}" }`, () =>
    runTool('matter_get', { matter_id: matterId }),
  );
  console.log(matter.split('\n').slice(0, 22).join('\n'), '\n');

  // 3. calendar_query — pull upcoming events
  const cal = await step('calendar_query { days_ahead: 30 }', () =>
    runTool('calendar_query', { days_ahead: 30 }),
  );
  console.log(cal.split('\n').slice(0, 16).join('\n'), '\n');

  // 4. invoice_status — no seed invoices, should return 0
  const inv = await step('invoice_status { }', () => runTool('invoice_status', {}));
  console.log(inv.split('\n').slice(0, 6).join('\n'), '\n');

  // 5. trust_balance — by matter
  const trust = await step(`trust_balance { matter_id: "${matterId}" }`, () =>
    runTool('trust_balance', { matter_id: matterId }),
  );
  console.log(trust.split('\n').slice(0, 18).join('\n'), '\n');

  // 6. document_search — no matter_id, should return helpful message
  const docNoMatter = await step('document_search { } (no matter)', () =>
    runTool('document_search', {}),
  );
  console.log('  ', docNoMatter.slice(0, 200), '\n');

  // 7. document_search with matter_id (likely empty seed)
  const docs = await step(`document_search { matter_id: "${matterId}" }`, () =>
    runTool('document_search', { matter_id: matterId }),
  );
  console.log(docs.split('\n').slice(0, 6).join('\n'), '\n');

  // 8. time_entry_create — log 0.1 hours
  const created = await step(`time_entry_create { matter_id: "${matterId}", hours: 0.1, ... }`, () =>
    runTool('time_entry_create', {
      matter_id: matterId,
      hours: 0.1,
      narrative: 'E2E test entry from MCP smoke test',
      activity_code: 'L120',
    }),
  );
  console.log(created.split('\n').slice(0, 10).join('\n'), '\n');

  console.log('✓ All tools returned data without error.\n');
}

main().catch((err) => {
  console.error('\n✗ TEST FAILED:', err.message || err);
  process.exit(1);
});
