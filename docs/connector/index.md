---
title: OpenLawFirm Connector for Claude
description: Drive law firm practice management workflows from Claude — matters, time, trust accounting, documents, invoices, and calendar.
---

# OpenLawFirm Connector for Claude

The OpenLawFirm connector exposes your law firm's practice-management data to [Claude](https://claude.ai) via the Model Context Protocol. Search matters, log time, query trust balances, find documents, check invoice status, and pull upcoming deadlines — all from natural language in Claude Cowork, Claude Code, or any Claude surface.

This connector is the **EXPOSE** layer of OpenLawFirm's architecture. The system of record stays inside OpenLawFirm; Claude becomes the universal interface.

## What it does

Once installed and authorized, the connector gives Claude seven tools for working with your OpenLawFirm instance:

- **`matter_search`** — find matters by client, attorney, status, or open text
- **`matter_get`** — retrieve full detail for a specific matter
- **`time_entry_create`** — log a billable or non-billable time entry in 0.1-hour increments with optional LEDES codes
- **`document_search`** — find documents scoped to a matter or across the firm
- **`invoice_status`** — query invoice status, balance, and aging
- **`trust_balance`** — query IOLTA trust balances (read-only — modifications go through the OpenLawFirm UI for audit-trail integrity)
- **`calendar_query`** — pull upcoming deadlines, hearings, and statutes of limitations

[Full tool reference →](./tools.md)

## Who it's for

The OpenLawFirm connector is built for law firms with **1 to 50 attorneys** running OpenLawFirm as their practice-management system. If your firm uses OpenLawFirm and at least one attorney has a paid Claude subscription, this connector unlocks workflow surfaces that weren't possible before.

The connector pairs naturally with [Anthropic's practice-area plugins](https://github.com/anthropics/claude-for-legal):

- **Litigation Legal** — for personal injury, civil litigation, family law, criminal defense
- **Commercial Legal** — for general business law
- **Employment Legal** — for employment defense or plaintiff-side
- **IP Legal** — for trademark, copyright, trade secret practices
- **Privacy Legal** — for privacy and data protection counsel

Activate the plugins that match your practice areas in your Claude account; the OpenLawFirm connector provides the matter and time data; the combination handles the heavy lifting.

## How it works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│                 │  MCP    │                  │  HTTPS  │                     │
│  Claude client  │ ──────▶ │ openlawfirm-mcp  │ ──────▶ │ OpenLawFirm Express │
│  (Cowork, Code) │ Stream- │  (this conn-     │  JWT    │  API + PostgreSQL   │
│                 │ able    │   ector)         │         │                     │
└─────────────────┘ HTTP    └──────────────────┘         └─────────────────────┘
                                     │
                                     │ Validates JWT signatures
                                     ▼
                            ┌──────────────────┐
                            │ openscaffold-    │
                            │ oauth (JWKS)     │
                            └──────────────────┘
```

The connector is a thin routing layer. It does not query the database directly — every tool call goes through OpenLawFirm's existing REST API, preserving the access controls, audit logging, and compliance posture the API already implements. You never have to grant Claude direct database access.

## Authentication and authorization

The connector uses **OAuth 2.0 with PKCE**. When you first invoke an OpenLawFirm tool from Claude, you'll be redirected to your firm's OpenLawFirm sign-in. After you sign in, you'll see a consent screen showing exactly which scopes Claude is requesting (matter read, time write, trust read, etc.). Approve the scopes you're comfortable with — you can revoke at any time from your OpenLawFirm account settings.

[Installation and authentication guide →](./install.md)

## Data and privacy

The connector does not store your matter, client, or trust data. Every tool call is a real-time pass-through to your OpenLawFirm instance. The only persistent data the connector holds is:

- Your OAuth client credentials (encrypted)
- Audit log entries (which user invoked which tool when, with high-level inputs — never document contents or client PII)

[Privacy and data handling details →](./privacy.md)

## Get started

1. **Confirm your firm runs OpenLawFirm.** This connector is built specifically for OpenLawFirm deployments. If you're evaluating practice management systems, see the [OpenLawFirm GitHub repo](https://github.com/Open-Scaffold-Labs/OpenLawFirm).
2. **Have a paid Claude subscription.** The connector works on Claude Pro, Max, Team, and Enterprise plans.
3. **Install the connector** from the [Anthropic Connectors Directory](https://claude.ai/directory/connectors) (look for "OpenLawFirm" under the Legal category).
4. **Sign in** with your OpenLawFirm credentials when prompted. Approve the requested scopes.
5. **Try it.** Ask Claude: *"Show me my matters with upcoming deadlines this week."*

[Installation walkthrough →](./install.md)

## Support

- **Repository:** [github.com/Open-Scaffold-Labs/OpenLawFirm](https://github.com/Open-Scaffold-Labs/OpenLawFirm)
- **Issues:** [github.com/Open-Scaffold-Labs/OpenLawFirm/issues](https://github.com/Open-Scaffold-Labs/OpenLawFirm/issues)
- **Email:** `support@openscaffoldlabs.com`
- **Security:** `security@openscaffoldlabs.com` (responsible disclosure — see [SECURITY.md](https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/SECURITY.md))

## License

The OpenLawFirm connector and the OpenLawFirm platform are open source under the MIT license. Self-host if you prefer; we also offer hosted single-tenant SaaS.

## Status

- **Connector version:** 0.1 (initial release)
- **Compatible with Claude:** all paid plans
- **Compatible with OpenLawFirm:** v1.0+ (in active development; see [IMPLEMENTATION.md](https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/IMPLEMENTATION.md))
