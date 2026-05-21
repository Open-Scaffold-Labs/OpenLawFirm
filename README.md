# OpenLawFirm

**Practice management for law firms with 1–50 attorneys.**

An open-source, modular practice management platform built on the [Open Scaffold Labs](https://openscaffoldlabs.com) shared infrastructure. One PostgreSQL database. One component library. One adapter layer. No integration tax.

> ⚠️ **Status: Demo-ready locally; production deploy pending.** The full stack (API, OAuth 2.0 + PKCE auth, MCP server with all 7 tools wired) runs end-to-end against the shared PostgreSQL database with a realistic 10-matter / 59-time-entry / $92K-IOLTA seed dataset. Production deployment to `*.openscaffoldlabs.com` subdomains is the remaining gate before Anthropic Connectors Directory submission. See [STATUS.md](./STATUS.md) for the live submission-readiness tracker and [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the phased roadmap.

## Why

The average attorney at a 1–50 attorney firm uses six or more different software tools to manage a single client matter, bills only 2.5 hours of an 8–10 hour workday, and loses up to 30% of billable time to administrative overhead. Firms in this size range pay between $8,000 and $21,000 per attorney per year on technology that rarely talks to itself — and they operate under constant compliance risk because billing, banking, and trust accounting live in separate systems that disagree.

OpenLawFirm is the practice management vertical of the Open Scaffold ecosystem. Every module reads from and writes to a single PostgreSQL database. Every UI is built from one React component library. Every external service is wrapped behind a stable adapter interface. There is no integration tax because there is nothing to integrate.

For the full thesis, see *The Fractured Law Firm: Why 1–50 Attorney Firms Need a Unified Architecture* (white paper available on request — `dale@openscaffoldlabs.com`).

## What's included

- **Matter management** — clients, matters, conflict checks, statutes of limitations
- **Time & billing** — six-minute increments, LEDES 1998B/2000 export, UTBMS task and activity codes
- **Trust accounting** — IOLTA management with three-way reconciliation (bank statement ↔ trust journal ↔ per-client sub-ledger)
- **Document engine** — template library, clause snippets, OCR via Tesseract.js
- **E-signature** — DocuSeal integration (open source) via the shared signature adapter
- **Client portal** — secure messaging, document exchange, invoice viewing and payment
- **Calendar & deadlines** — court dates, jurisdiction-aware deadline rules
- **Reporting & analytics** — attorney utilization, matter profitability, realization rates

Each module reads and writes to the same `olf_*` tables in a shared PostgreSQL schema. See `CLAUDE.md` for the full table inventory and API surface.

## AI integration

OpenLawFirm is designed to be reachable from [Claude for Legal](https://www.anthropic.com/) via a published MCP (Model Context Protocol) server (`openlawfirm-mcp`, in development). A firm using OpenLawFirm + Claude can drive matter management, time entry, document retrieval, and trust queries from natural language — and combine that with Anthropic's 12 practice-area plugins, plus their existing Westlaw, LexisNexis, DocuSign, or iManage subscriptions, all in one orchestrated session.

We don't ship a built-in AI assistant. We ship the data layer that makes one possible.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Express.js, PostgreSQL (direct queries — no ORM)
- **Auth:** JWT + bcrypt, shared users table across the Open Scaffold ecosystem
- **Shared core:** `@openscaffold/core` (component library) and `@openscaffold/integrations` (adapter layer) linked via `file:` references
- **License:** MIT

## Getting started

> Development docs are coming alongside Phase 1. For now, this section gives the basics; full setup will land with the first release candidate.

Prerequisites:

- Node.js 20+
- PostgreSQL 15+
- The `@openscaffold/core` and `@openscaffold/integrations` packages available locally (the shared Open Scaffold ecosystem)

```bash
# Clone the repo
git clone https://github.com/Open-Scaffold-Labs/OpenLawFirm.git
cd OpenLawFirm

# Install dependencies
cd client && npm install
cd ../server && npm install

# Configure the shared PostgreSQL database (see CLAUDE.md for connection string)

# Start the server
cd server && npm run dev
# Server starts on http://localhost:3024

# Start the client (in a separate terminal)
cd client && npm run dev
# Client starts on http://localhost:5192
```

Demo credentials for local development are documented in `CLAUDE.md`.

For a richer demo dataset (10 matters across 6 practice areas, 59 time entries, IOLTA balances, upcoming deadlines), run:

```bash
cd server && node --env-file=.env seed-realistic.js
```

To walk through the full Claude + OpenLawFirm demo, follow [`mcp/DEMO-SETUP.md`](./mcp/DEMO-SETUP.md) — it has every command and prompt for the 5-minute, 6-scene demo flow.

## Roadmap

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the full phased plan and the strategic reframe in light of Anthropic's May 2026 Claude for Legal launch. See [STATUS.md](./STATUS.md) for the live submission-readiness tracker.

In summary:

- **Phase 1 (Months 1–2):** Foundation hardening — three-way IOLTA reconciliation, LEDES export, conflict checks, migration tooling from Clio/PracticePanther/Smokeball
- **Phase 2 (Months 2–4):** MCP-first document and signature workflow — template library, DocuSeal, client portal, the `openlawfirm-mcp` connector published to Anthropic's directory
- **Phase 3 (Months 4–6):** Claude-driven intelligence — OpenLawFirm Skill, setup wizard, jurisdiction deadline engine, partner dashboards
- **Phase 4 (Months 6+):** Practice-area verticals (personal injury, family law, real estate, immigration)

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development conventions, branching strategy, and how to propose changes.

For security issues, see [SECURITY.md](./SECURITY.md) — please do not file public issues for vulnerabilities.

## License

MIT — see [LICENSE](./LICENSE). You're free to use, modify, self-host, and contribute. The Open Scaffold ecosystem is built on the principle that a law firm should never be locked out of its own system by a vendor's business decisions.

## Contact

- **Project lead:** Dale Raaen — `dale@openscaffoldlabs.com`
- **Engineering:** Matt Lavin — `matt@openscaffoldlabs.com`
- **Organization:** [Open Scaffold Labs](https://openscaffoldlabs.com)
- **Issues & feature requests:** [GitHub Issues](https://github.com/Open-Scaffold-Labs/OpenLawFirm/issues)
