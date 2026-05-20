// Thin HTTP client for the OpenLawFirm Express API.
// Every MCP tool routes through this client so we preserve the access controls
// and audit logging the REST API already implements.
//
// In v0.1, this client forwards the validated user's identity to the API via
// a service-to-service header. In production, the auth model will be:
//   - User authenticates to Claude via OAuth (openscaffold-oauth)
//   - Claude sends the user's access token to this MCP server
//   - This MCP server validates the token, then calls the OpenLawFirm API
//     using a service token + the validated user's sub claim
//
// TODO(matt): finalize service-to-service auth pattern in Sprint 1 alongside
// the openscaffold-oauth design.

import fetch from 'node-fetch';

const API_BASE = process.env.OPENLAWFIRM_API_BASE_URL || 'http://localhost:3024';

/**
 * Call the OpenLawFirm API on behalf of the authenticated user.
 *
 * @param {object} opts
 * @param {string} opts.path - API path, e.g. "/api/matters"
 * @param {string} [opts.method] - HTTP method, default GET
 * @param {object} [opts.query] - query parameters
 * @param {object} [opts.body] - JSON body
 * @param {object} opts.auth - the validated JWT payload from auth.js (req.auth)
 * @returns {Promise<any>} parsed JSON response
 */
export async function callApi({ path, method = 'GET', query, body, auth }) {
  const url = new URL(path, API_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    // TODO(matt): replace with proper service-to-service auth
    'X-Openlawfirm-User-Id': String(auth?.sub || ''),
    'X-Openlawfirm-Scopes': String(auth?.scope || ''),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`OpenLawFirm API ${method} ${path} failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}
