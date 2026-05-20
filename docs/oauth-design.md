# OAuth 2.0 + PKCE Architecture for the Open Scaffold Ecosystem

**Status:** Draft v1 · 2026-05-19
**Decision needed by:** Sprint 1 kickoff (week 1)
**Decider:** Dale + Matt
**Author:** Claude (drafting on Dale's behalf)

## Context

The `openlawfirm-mcp` connector cannot be submitted to Anthropic's Connectors Directory without OAuth 2.0 with PKCE. Anthropic's directory submission requirements explicitly list it. Beyond `openlawfirm-mcp`, every other vertical in the Open Scaffold ecosystem (OpenFirehouse, OpenRestaurant, OpenPropertyManager, OpenCPA, OpenInteriorDesign, etc. — 21+ apps) will eventually want its own MCP server. That makes OAuth a cross-cutting infrastructure concern, not a per-app concern.

The decision in front of us: do we embed OAuth in each vertical's Express app, or build a shared OAuth service that every vertical uses?

## Option A — Embedded OAuth per vertical

Each app (OpenLawFirm, OpenFirehouse, etc.) implements its own OAuth 2.0 authorization server inside its existing Express backend.

**Pros**
- Fastest to ship the first one. We can stand up OAuth in `server/src/routes/oauth.js` in a couple of days.
- No new service to deploy or maintain.
- No inter-service dependency at runtime — each vertical is self-contained.

**Cons**
- Each of the 21+ verticals reimplements OAuth. Even with `@openscaffold/core` extracting common logic, drift is inevitable.
- Token formats, expiry policies, and scope semantics diverge across apps. Auditing the ecosystem becomes harder over time.
- A firm using OpenLawFirm + OpenFirehouse + OpenCPA has three separate sets of OAuth clients to manage in three separate admin UIs. The shared-database promise of the Open Scaffold ecosystem is undermined at the identity layer.
- Compliance posture is fragmented. If a single vertical has a security incident, the blast radius framing is unclear — was just that app compromised, or the ecosystem identity layer? Embedded OAuth blurs that line.
- MCP directory submission requires per-vertical OAuth metadata, branding, and approval. Submitting 21+ separate OAuth implementations is a maintenance tax.

## Option B — Shared `openscaffold-oauth` service (recommended)

A single OAuth 2.0 authorization server, deployed as its own service in the Open Scaffold ecosystem, that issues tokens for every vertical's resource server (including their MCP servers).

**Pros**
- One implementation. One audit surface. One trust anchor.
- A firm signs in once and accesses every Open Scaffold vertical they're entitled to — the launcher experience referenced in the *Fractured Law Firm* white paper becomes seamless instead of N separate logins.
- Token scopes can encode both *which vertical* and *which permissions*. A token issued to `openlawfirm-mcp` carries `aud: openlawfirm` and scope `matter:read time:write trust:read`. A token issued to `openfirehouse-mcp` is structurally identical with different audience and scopes.
- MCP directory submissions all point to the same OAuth metadata endpoint (`https://openscaffoldlabs.com/.well-known/oauth-authorization-server`). One brand entity, one trust story, one security disclosure path.
- Future capabilities (single sign-on, MFA enforcement, audit log of OAuth grants across the ecosystem) ship once, not 21 times.

**Cons**
- New service to deploy, monitor, and maintain. One more thing that can go down.
- Inter-service dependency: every vertical's resource server (and its MCP server) needs to call out to the OAuth service or validate tokens locally.
- Slightly more setup for Sprint 1 — we have to deploy two things (`openscaffold-oauth` + `openlawfirm-mcp`) instead of one.

## Recommendation

**Option B — shared `openscaffold-oauth` service.** The downside is two days of additional Sprint 1 work to stand up the service. The upside compounds across the 21+ verticals in the ecosystem and matches the architectural thesis of the Open Scaffold white papers: shared infrastructure beats per-app duplication, even when the duplication is "cheap."

## Proposed architecture

### Components

**`openscaffold-oauth`** (new service) — the OAuth 2.0 authorization server.

- Repository: `Open-Scaffold-Labs/openscaffold-oauth` (to be created)
- Hosting: its own subdomain — `auth.openscaffoldlabs.com`
- Storage: the shared PostgreSQL database (`oso_` table prefix per ecosystem convention)
- Tech stack: Node.js + Express + the `@openscaffold/core` shared utilities, matching the rest of the ecosystem

**Resource servers** (each vertical's API and MCP server) — validate access tokens issued by `openscaffold-oauth`.

- For OpenLawFirm: existing Express API at `api.openlawfirm.openscaffoldlabs.com` (or equivalent) gains a JWT-validating middleware. The new `openlawfirm-mcp` server at `mcp.openlawfirm.openscaffoldlabs.com` uses the same middleware.
- JWT signatures verified via JWKS endpoint published by `openscaffold-oauth`, cached locally. No round-trip to the auth server on every request.

### OAuth flows supported

1. **Authorization Code with PKCE** — the MCP client flow. Anthropic's Connectors Directory requires this. The Claude client redirects the user to `auth.openscaffoldlabs.com/authorize`, user signs in, gets redirected back with a code, exchanges code for token.

2. **Client Credentials** — server-to-server flow, used by internal Open Scaffold services that need to call each other's APIs without a user context.

3. **Refresh Token** — standard token refresh.

(We are intentionally *not* supporting Resource Owner Password Credentials Grant. It is deprecated in OAuth 2.1 and creates phishing surfaces.)

### Endpoints exposed by `openscaffold-oauth`

```
GET  /.well-known/oauth-authorization-server     (discovery metadata, required by spec)
GET  /.well-known/jwks.json                       (public keys for JWT validation)
GET  /authorize                                   (start auth code flow)
POST /token                                       (exchange code for token, refresh)
POST /revoke                                      (revoke token)
GET  /userinfo                                    (current user profile, opaque scopes)
POST /clients                                     (admin-only: register a new OAuth client)
GET  /clients/:id                                 (admin-only: client metadata)
```

### Token shape

- **Access tokens**: short-lived JWT (15 min default). Signed with RS256 (key rotation supported via JWKS).
- **Refresh tokens**: opaque, longer-lived (30 days), stored server-side, rotated on every use.
- **JWT claims**: `iss`, `sub` (user id from shared `users` table), `aud` (e.g., `openlawfirm`), `exp`, `iat`, `scope` (space-separated scopes), `client_id` (the requesting MCP client).

### Scope namespace

Scopes are namespaced by vertical and resource: `<vertical>:<resource>:<action>`.

Examples for OpenLawFirm:

- `openlawfirm:matter:read`
- `openlawfirm:matter:write`
- `openlawfirm:time:write`
- `openlawfirm:trust:read`
- `openlawfirm:document:read`
- `openlawfirm:calendar:read`

A token issued to the `openlawfirm-mcp` connector for a typical attorney might carry: `openlawfirm:matter:read openlawfirm:matter:write openlawfirm:time:write openlawfirm:document:read openlawfirm:invoice:read openlawfirm:trust:read openlawfirm:calendar:read`.

### Client registration

Each MCP server (or any application) that wants to talk to the ecosystem registers as an OAuth client. For Anthropic's directory submission, we register one OAuth client per Anthropic-listed connector. The `openlawfirm-mcp` connector registers as `client_id: openlawfirm-mcp-claude-connector`.

Client registration is an admin operation in Sprint 1. Self-service client registration is a Phase 4 nice-to-have, not a v1.0 requirement.

### Why this is fine to ship in Sprint 1

The fast path:

1. Stand up `openscaffold-oauth` as a minimal Express app with the endpoints above (~2 days).
2. Store clients, refresh tokens, and grant history in `oso_*` tables in the shared DB (~half day for schema and migrations).
3. Use the existing shared `users` table for authentication. Bcrypt password check is already there.
4. Generate RS256 keys, publish JWKS (~half day).
5. Write the JWT-validating middleware once in `@openscaffold/core`. Every vertical's API + MCP server imports it (~half day).

Total: ~3.5 days of focused work. Slots in alongside the IOLTA reconciliation and LEDES export work in Sprint 1.

## Out of scope for this memo

- **MFA / 2FA enforcement** — a Phase 2+ concern. Initial implementation supports password + email-based code (existing pattern).
- **Social login (Google, Apple, etc.)** — Phase 3+.
- **SAML / enterprise SSO** — Phase 4 only if a design-partner firm requests it.
- **Fine-grained ABAC / matter-level permissions** — Phase 2+. Initial implementation uses role-based scopes per vertical; matter-level filtering happens in the resource server, not the auth server.

## Open questions for Matt

1. Are you comfortable with Node.js + Express for `openscaffold-oauth`, or do you want a more battle-tested library (Ory Hydra, Authentik, Keycloak self-hosted)? My recommendation is roll our own because (a) the surface is small, (b) we already have an Express + Postgres pattern across every vertical, (c) external auth servers carry operational overhead. But if you've used one and like it, that's a defensible alternate path.
2. Token storage — refresh tokens hashed in the DB (bcrypt or argon2), or stored opaquely with reference IDs only? My recommendation is hashed-in-DB, matching how we store user passwords.
3. Key rotation policy — how often do we rotate the RS256 signing keys? Recommend every 90 days with a 7-day overlap window where both old and new keys validate.

## References

- [RFC 6749 — OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [RFC 7636 — PKCE](https://www.rfc-editor.org/rfc/rfc7636)
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- [Anthropic Remote MCP servers docs](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers)
- [Anthropic Connectors Directory submission requirements](https://claude.com/docs/connectors/building/submission)
