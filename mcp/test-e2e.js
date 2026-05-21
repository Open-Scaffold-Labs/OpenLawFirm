// End-to-end test for the OpenLawFirm MCP stack.
//
// Walks the full OAuth 2.0 Authorization Code + PKCE flow against
// openscaffold-oauth, then makes an MCP tool call to openlawfirm-mcp,
// then verifies the response includes real data from the OpenLawFirm API.
//
// Prereqs:
//   - openfirehouse PostgreSQL database is up
//   - OpenLawFirm server running on http://localhost:3024
//   - openscaffold-oauth running on http://localhost:4000
//   - openlawfirm-mcp running on http://localhost:3825
//
// Usage:
//   node --env-file=.env test-e2e.js

import crypto from 'crypto';
import fetch from 'node-fetch';

const OAUTH = 'http://localhost:4000';
const MCP = 'http://localhost:3825';
const REDIRECT_URI = 'http://localhost:8765/callback';
const CLIENT_ID = 'openlawfirm-mcp-claude-connector';
const USERNAME = 'attorney';
const PASSWORD = 'lawfirm1234';

const SCOPES = [
  'openid', 'profile', 'email',
  'openlawfirm:matter:read',
  'openlawfirm:time:write',
  'openlawfirm:calendar:read',
  'openlawfirm:trust:read',
  'openlawfirm:invoice:read',
  'openlawfirm:document:read',
].join(' ');

// ─── PKCE ─────────────────────────────────────────────────────────────
function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
const verifier = base64url(crypto.randomBytes(32));
const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

// ─── Cookie jar (tiny) ─────────────────────────────────────────────────
const cookieJar = new Map();
function captureSetCookie(res) {
  const raw = res.headers.raw()['set-cookie'] || [];
  for (const line of raw) {
    const [pair] = line.split(';');
    const [k, v] = pair.split('=');
    cookieJar.set(k.trim(), v.trim());
  }
}
function cookieHeader() {
  return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ─── Helpers ───────────────────────────────────────────────────────────
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

// ─── 1. Discovery ──────────────────────────────────────────────────────
async function discovery() {
  const res = await fetch(`${OAUTH}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`discovery ${res.status}`);
  return res.json();
}

// ─── 2. Start auth code flow ───────────────────────────────────────────
async function authorize() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: 'e2e-test-state',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const res = await fetch(`${OAUTH}/auth?${params}`, { redirect: 'manual' });
  captureSetCookie(res);
  const loc = res.headers.get('location');
  if (!loc || !loc.includes('/interaction/')) throw new Error(`unexpected location: ${loc}`);
  return loc;
}

// Resolve a Location header (which may be relative) against the OAuth base.
function absolute(loc) {
  if (!loc) return loc;
  if (loc.startsWith('http')) return loc;
  return new URL(loc, OAUTH).toString();
}

// ─── 3. Load interaction page (sets cookies, identifies uid) ──────────
async function loadInteraction(loc) {
  const url = absolute(loc);
  const res = await fetch(url, {
    headers: { cookie: cookieHeader() },
    redirect: 'manual',
  });
  captureSetCookie(res);
  // Extract uid from URL
  const m = url.match(/\/interaction\/([^/?]+)/);
  if (!m) throw new Error('could not parse uid');
  return m[1];
}

// ─── 4. Submit login ───────────────────────────────────────────────────
async function login(uid) {
  const body = new URLSearchParams({ username: USERNAME, password: PASSWORD });
  const res = await fetch(`${OAUTH}/interaction/${uid}/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieHeader(),
    },
    body,
    redirect: 'manual',
  });
  captureSetCookie(res);
  // Should redirect to /auth/:uid which then redirects to /interaction/:uid for consent
  if (res.status !== 303 && res.status !== 302) {
    const text = await res.text();
    throw new Error(`login expected redirect, got ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.headers.get('location');
}

// ─── 5. Follow redirects until consent or callback ─────────────────────
async function followUntilConsentOrCallback(startLoc) {
  let loc = absolute(startLoc);
  const debug = process.env.E2E_DEBUG === '1';
  for (let i = 0; i < 8; i++) {
    if (debug) console.log(`\n    [${i}] ${loc}`);
    if (loc.startsWith(REDIRECT_URI)) return loc;
    const res = await fetch(loc, { headers: { cookie: cookieHeader() }, redirect: 'manual' });
    captureSetCookie(res);
    if (debug) console.log(`        status: ${res.status}, location: ${res.headers.get('location')}`);
    if (res.status === 303 || res.status === 302) {
      loc = absolute(res.headers.get('location'));
      continue;
    }
    if (loc.includes('/interaction/') && res.status === 200) {
      const m = loc.match(/\/interaction\/([^/?]+)/);
      if (!m) throw new Error('could not parse consent uid');
      return { needsConsent: true, uid: m[1] };
    }
    throw new Error(`unexpected status ${res.status} at ${loc}`);
  }
  throw new Error('too many redirects without reaching callback or consent');
}

// ─── 6. Submit consent ─────────────────────────────────────────────────
async function consent(uid) {
  const res = await fetch(`${OAUTH}/interaction/${uid}/confirm`, {
    method: 'POST',
    headers: { cookie: cookieHeader() },
    redirect: 'manual',
  });
  captureSetCookie(res);
  if (res.status !== 303 && res.status !== 302) {
    const text = await res.text();
    throw new Error(`consent expected redirect, got ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.headers.get('location');
}

// ─── 7. Exchange code for token ────────────────────────────────────────
async function exchangeCode(callbackUrl) {
  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  if (!code) throw new Error(`no code in callback: ${callbackUrl}`);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });
  const res = await fetch(`${OAUTH}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  const tok = await res.json();
  return tok;
}

// ─── 8. Call an MCP tool ───────────────────────────────────────────────
async function callMcpTool(accessToken, toolName, args = {}) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  };
  const res = await fetch(`${MCP}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json, text/event-stream',
      authorization: `Bearer ${accessToken}`,
      origin: 'https://claude.ai',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`mcp ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Run ───────────────────────────────────────────────────────────────
async function main() {
  console.log('OpenLawFirm MCP end-to-end test\n');

  await step('Discovery metadata', discovery);
  const interactionUrl = await step('Start authorization', authorize);
  const loginUid = await step('Load login interaction', () => loadInteraction(interactionUrl));
  const afterLogin = await step('Submit login', () => login(loginUid));
  const consentOrCallback = await step('Follow redirects', () => followUntilConsentOrCallback(afterLogin));

  let callbackUrl;
  if (typeof consentOrCallback === 'string') {
    callbackUrl = consentOrCallback;
  } else {
    const afterConsent = await step('Submit consent', () => consent(consentOrCallback.uid));
    callbackUrl = await step('Follow to callback', () => followUntilConsentOrCallback(afterConsent));
    if (typeof callbackUrl !== 'string') throw new Error('expected callback URL after consent');
  }

  const token = await step('Exchange code for token', () => exchangeCode(callbackUrl));
  console.log(`  → access_token: ${token.access_token.slice(0, 40)}...`);
  console.log(`  → scopes:       ${token.scope}`);
  console.log(`  → expires_in:   ${token.expires_in}s\n`);

  // Make an MCP tool call
  const result = await step('Call matter_search via MCP', () =>
    callMcpTool(token.access_token, 'matter_search', { limit: 5 }),
  );
  console.log('\n--- matter_search response ---');
  if (result?.result?.content?.[0]?.text) {
    const text = result.result.content[0].text;
    console.log(text.slice(0, 600) + (text.length > 600 ? '\n... (truncated)' : ''));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  // calendar_query
  const cal = await step('Call calendar_query via MCP', () =>
    callMcpTool(token.access_token, 'calendar_query', { days_ahead: 14 }),
  );
  console.log('\n--- calendar_query response ---');
  if (cal?.result?.content?.[0]?.text) {
    console.log(cal.result.content[0].text.slice(0, 400));
  }

  console.log('\n✓ End-to-end test complete.\n');
}

main().catch((err) => {
  console.error('\n✗ TEST FAILED:', err.message || err);
  process.exit(1);
});
