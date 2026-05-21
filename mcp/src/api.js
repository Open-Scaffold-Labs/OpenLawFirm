// OpenLawFirm REST API client for the MCP server.
//
// Auth bridge model (v0.1):
//   1. Claude sends an OAuth access token (signed RS256 by openscaffold-oauth)
//      to this MCP server. auth.js validates the signature via JWKS.
//   2. For each tool call, we look up the user (by `sub` claim) in the
//      shared `users` table to get role, name, etc.
//   3. We mint a short-lived HS256 OpenLawFirm session JWT using the same
//      JWT_SECRET that the OpenLawFirm Express server uses.
//   4. We forward the API call with that session JWT as Bearer.
//
// This bridge is acceptable for v0.1 because the OAuth server and the
// OpenLawFirm API are deployed in the same trust boundary. For production
// hardening, replace with mutual TLS or signed service-to-service tokens.
// See docs/oauth-design.md for the longer-term plan.

import fetch from 'node-fetch';
import pg from 'pg';
import { SignJWT } from 'jose';

const { Pool } = pg;

const API_BASE = process.env.OPENLAWFIRM_API_BASE_URL || 'http://localhost:3024';
const OLF_JWT_SECRET = process.env.OLF_JWT_SECRET;
if (!OLF_JWT_SECRET) {
  throw new Error('OLF_JWT_SECRET must be set — see .env.example');
}
const SECRET_KEY = new TextEncoder().encode(OLF_JWT_SECRET);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/openfirehouse',
  max: 4,
});

// Cache user lookups for a brief window to avoid hammering the DB on every
// chained tool call. 60-second TTL is plenty — role and name don't change often.
const userCache = new Map(); // sub -> { user, expiresAt }

async function lookupUser(sub) {
  const cached = userCache.get(sub);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const { rows } = await pool.query(
    'SELECT id, username, name, role, email FROM users WHERE id = $1',
    [parseInt(sub, 10)]
  );
  if (!rows.length) {
    const err = new Error(`User not found: sub=${sub}`);
    err.status = 401;
    throw err;
  }
  const user = rows[0];
  userCache.set(sub, { user, expiresAt: Date.now() + 60 * 1000 });
  return user;
}

async function mintSessionJwt(user) {
  return await new SignJWT({
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(SECRET_KEY);
}

/**
 * Call the OpenLawFirm API on behalf of the authenticated user.
 *
 * @param {object} opts
 * @param {string} opts.path - API path (e.g. "/api/matters")
 * @param {string} [opts.method] - HTTP method, default GET
 * @param {object} [opts.query] - query parameters; undefined/null are stripped
 * @param {object} [opts.body] - JSON body for POST/PUT
 * @param {object} opts.auth - the validated OAuth JWT payload from auth.js
 * @returns {Promise<any>} parsed JSON response
 */
export async function callApi({ path, method = 'GET', query, body, auth }) {
  if (!auth?.sub) {
    const err = new Error('Missing sub claim on validated OAuth token');
    err.status = 401;
    throw err;
  }
  const user = await lookupUser(auth.sub);
  const sessionJwt = await mintSessionJwt(user);

  const url = new URL(path, API_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionJwt}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`OpenLawFirm API ${method} ${path} -> ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}
