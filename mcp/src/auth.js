// JWT validation middleware. Validates access tokens issued by openscaffold-oauth
// using the public JWKS endpoint. Caches keys via jose's createRemoteJWKSet.
//
// On success, attaches the validated JWT payload to req.auth so tool handlers
// can read req.auth.sub (user id), req.auth.scope (granted scopes), etc.

import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = process.env.OSO_JWKS_URL || 'http://localhost:4000/.well-known/jwks.json';
const ISSUER = process.env.OSO_ISSUER || 'https://auth.openscaffoldlabs.com';
const AUDIENCE = process.env.OSO_AUDIENCE || 'openlawfirm';

// Cached remote JWKS — fetches keys lazily and refreshes per jose defaults.
const jwks = createRemoteJWKSet(new URL(JWKS_URL));

/**
 * Express middleware that validates the Authorization: Bearer <token> header.
 * Rejects requests without a valid token from openscaffold-oauth.
 *
 * @type {import('express').Handler}
 */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      detail: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'invalid_token',
      detail: String(err?.message || err),
    });
  }
}

/**
 * Helper: assert that the current request has a specific scope.
 * Throws if not — caught and turned into an MCP error by the tool wrapper.
 *
 * @param {import('express').Request} req
 * @param {string} requiredScope
 */
export function requireScope(req, requiredScope) {
  const scopes = String(req?.auth?.scope || '').split(/\s+/).filter(Boolean);
  if (!scopes.includes(requiredScope)) {
    const err = new Error(`Missing required scope: ${requiredScope}`);
    err.status = 403;
    throw err;
  }
}
