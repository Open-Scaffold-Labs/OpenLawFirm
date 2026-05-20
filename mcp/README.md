# openlawfirm-mcp

**Status:** v0.1 scaffold — Sprint 2 deliverable per [IMPLEMENTATION.md](../IMPLEMENTATION.md) and [INTEGRATIONS.md](../INTEGRATIONS.md).

A remote Model Context Protocol (MCP) server that exposes OpenLawFirm matter, time, trust, document, invoice, and calendar data to [Claude](https://claude.ai). Once published to the [Anthropic Connectors Directory](https://claude.ai/directory/connectors), any Claude user authorized to a firm's OpenLawFirm instance can drive practice-management workflows from natural language.

This is the **EXPOSE** layer of the OpenLawFirm + Claude for Legal architecture. See [INTEGRATIONS.md](../INTEGRATIONS.md) for the full BUILD / CONNECT / EXPOSE framework.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│                 │  MCP    │                  │  HTTPS  │                     │
│  Claude client  │ ──────▶ │ openlawfirm-mcp  │ ──────▶ │ OpenLawFirm Express │
│  (Cowork, Code) │ Stream- │  (this package)  │  JWT    │  API + PostgreSQL   │
│                 │ able    │                  │         │                     │
└─────────────────┘ HTTP    └──────────────────┘         └─────────────────────┘
                                     │
                                     │ Validates JWT signatures
                                     ▼
                            ┌──────────────────┐
                            │ openscaffold-    │
                            │ oauth (JWKS)     │
                            └──────────────────┘
```

The MCP server is a thin authorization-and-routing layer. It does not query the database directly — every tool call goes through the existing OpenLawFirm REST API, preserving the access controls and audit logging the API already implements.

## Tool surface

Seven tools exposed in v0.1. Each carries proper `readOnlyHint` or `destructiveHint` annotations per [Anthropic Connectors Directory requirements](https://claude.com/docs/connectors/building/submission) (missing annotations cause ~30% of submission rejections).

| Tool | Annotation | Purpose |
|---|---|---|
| `matter_search` | readOnly | Search matters by client, attorney, status, practice area, or open text |
| `matter_get` | readOnly | Retrieve full matter detail by ID |
| `time_entry_create` | destructive | Create a time entry on a matter |
| `document_search` | readOnly | Search documents within a matter scope |
| `invoice_status` | readOnly | Query invoice status and balance |
| `trust_balance` | readOnly | Query IOLTA trust balance for a client or matter |
| `calendar_query` | readOnly | Query upcoming deadlines, hearings, statutes of limitations |

See `src/tools/*.js` for input schemas.

## Auth

OAuth 2.0 with PKCE. Access tokens issued by `openscaffold-oauth` ([design memo](../docs/oauth-design.md)). The MCP server validates JWT signatures locally using the JWKS endpoint — no round-trip to the auth server on every request.

Required scopes for v0.1:

- `openlawfirm:matter:read`
- `openlawfirm:matter:write` (only needed if a tool ever creates matters — not in v0.1, reserved)
- `openlawfirm:time:write` (for `time_entry_create`)
- `openlawfirm:document:read`
- `openlawfirm:invoice:read`
- `openlawfirm:trust:read`
- `openlawfirm:calendar:read`

## Local development

```bash
cd mcp
npm install
cp .env.example .env
# Edit .env with your local OpenLawFirm API URL and openscaffold-oauth JWKS URL
npm run dev
```

Server listens on `PORT` (default 3825). The MCP endpoint is `/mcp`. The discovery endpoint is `/.well-known/mcp-server`.

Test from Claude Cowork by adding a custom connector pointing at `http://localhost:3825/mcp`.

## Production deployment

- Subdomain: `mcp.openlawfirm.openscaffoldlabs.com` (or per-firm subdomain for single-tenant SaaS deployments)
- HTTPS required — Anthropic rejects non-HTTPS MCP servers from the directory
- Origin-header validation enforced
- CORS configured to allow `claude.ai` and `claude.com` origins only

## Submission to Anthropic Connectors Directory

Checklist for submission (Sprint 2 deliverable):

- [ ] All seven tools have `readOnlyHint` or `destructiveHint` annotations
- [ ] OAuth 2.0 + PKCE working end-to-end against `openscaffold-oauth`
- [ ] HTTPS deployed at production subdomain
- [ ] Origin-header validation tested
- [ ] Server logo at 512×512 in Electric Indigo `#4F46E5`
- [ ] Favicon verification (Anthropic verifies the favicon at the server's domain)
- [ ] Public documentation URL stable
- [ ] Promotional screenshots for MCP Apps surface
- [ ] Submission form at https://claude.com/docs/connectors/building/submission

## Status

This package is currently a **scaffold**. All seven tool handlers return stub responses pending implementation. See the body of each file in `src/tools/` for the exact TODOs.

## License

MIT — see [LICENSE](../LICENSE).
