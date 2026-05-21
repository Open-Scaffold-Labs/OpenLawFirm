# OpenLawFirm — Submission Readiness Status

**Updated:** 2026-05-21 (overnight polish sweep)
**Goal:** Submit `openlawfirm-mcp` to Anthropic Connectors Directory
**Critical-path estimate to submission:** ~2 weeks (gated on Matt's production deploy + Dale's partner program follow-throughs)

This is the single source of truth for "where are we, and what's gating the next milestone." Updated as deliverables land. See [SESSION-WRAP.md](./SESSION-WRAP.md) for the latest session summary.

---

## Headline status

| Phase | State | What's missing |
|---|---|---|
| **Sprint 1** — Foundation hardening | ✓ Engineering done locally | Production deploy, OpenFirehouse migration |
| **Sprint 2** — MCP server + submission package | ✓ Engineering done, Pages enabled | Production HTTPS deploy + favicon |
| **Sprint 3** — Native CONNECT adapters | ✓ Code done, awaiting credentials | Box / iManage / NetDocuments partner program signups |
| **Sprint 4** — Demo readiness | ✓ Seed + run-book + status doc | 5-minute video, design-partner outreach |
| **Sprint 5+** — Polish + shared modules + CRUD | ✓ Complete (overnight sweep) | Optional future polish (see SESSION-WRAP) |

**One-line summary:** Engineering is functionally complete and demo-ready locally. The React app now has working CRUD across every entity. The remaining work is *operational* (deployments, account signups, video recording) — not coding.

---

## What's new since the original Sprint 1–4 ship

The session of 2026-05-20/21 added:

- **CRUD across every entity** — Matters, Clients, Time Entries, Expenses, Contacts, Documents, Calendar, Trust transactions, Invoice generation + payment recording, all working through Modal-based forms
- **Shared modules from `@openscaffold/core`** — number generator (invoice + matter numbers), DataTable (sortable / searchable / paginated list views), PDF generation pattern (Python + reportlab matching the proposal generator)
- **LEDES 1998B invoice export** — 24-field pipe-delimited e-billing file with UTBMS task + activity codes, timekeeper classification, billing window dates
- **Server-side invoice PDF generation** — branded letterhead, bill-to, line items by category, totals, payment history
- **Utilization dashboard** — managing-partner view with firm-wide hours, per-attorney utilization vs. target, AR aging buckets, top matters by hours
- **Realistic demo seed** — 10 matters across 6 practice areas, 50+ time entries with UTBMS codes, $92K trust balance, 5 invoices, 12 documents, 18 calendar events

---

## What's working end-to-end right now

All running on Dale's MacBook against the shared `openfirehouse` PostgreSQL database:

| Service | URL | Status |
|---|---|---|
| OpenLawFirm API | http://localhost:3024 | ✓ |
| openscaffold-oauth (OAuth 2.0 + PKCE) | http://localhost:4000 | ✓ |
| openlawfirm-mcp | http://localhost:3825 | ✓ |
| PostgreSQL `openfirehouse` (21 olf_* tables) | localhost:5432 | ✓ |

Realistic demo dataset loaded: 10 matters across 6 practice areas, 59 time entries (102.9 hrs), 18 upcoming calendar events, $92,200 IOLTA balance, 12 documents, 5 invoices.

All 7 MCP tools (`matter_search`, `matter_get`, `time_entry_create`, `document_search`, `invoice_status`, `trust_balance`, `calendar_query`) tested with real data via `mcp/test-tools.js` — every tool returns rich responses including a real `time_entry_create` write to the database.

---

## Repo footprint

| Repository | URL | Commits today |
|---|---|---|
| `OpenLawFirm` | github.com/Open-Scaffold-Labs/OpenLawFirm | 7 |
| `openscaffold-integrations` | github.com/Open-Scaffold-Labs/openscaffold-integrations | 1 |
| `openscaffold-oauth` | *(local — needs GitHub repo created)* | 2 local |

---

## Connectors Directory submission checklist

Tracking the items in `mcp/SUBMISSION-CHECKLIST.md`.

### Engineering (~80% complete)

- [x] OAuth 2.0 + PKCE working (locally)
- [x] All 7 tools wired with correct `readOnlyHint`/`destructiveHint` annotations
- [x] Tools validated end-to-end against real data
- [x] Access control respects user matter-level permissions
- [x] Discovery endpoint at `/.well-known/mcp-server`
- [x] Origin-header validation enforced
- [ ] **Production deployment** at `mcp.openlawfirm.openscaffoldlabs.com` (HTTPS)
- [ ] **Production deployment** of `openscaffold-oauth` at `auth.openscaffoldlabs.com`
- [ ] Persistent JWKS keypair (currently regenerates per restart)
- [ ] PostgreSQL adapter for `openscaffold-oauth` (currently in-memory)

### Documentation (~95% complete)

- [x] `README.md` — project overview
- [x] `IMPLEMENTATION.md` — phased plan
- [x] `INTEGRATIONS.md` — connector integration matrix
- [x] `docs/connector/` — public docs site (index, install, tools, privacy)
- [x] `docs/_config.yml` — Jekyll/GitHub Pages config
- [x] `mcp/README.md` — connector package overview
- [x] `mcp/SUBMISSION-CHECKLIST.md` — 60+ item checklist
- [x] `mcp/DEMO-SCRIPT.md` — demo narrative
- [x] `mcp/DEMO-SETUP.md` — executable demo run-book
- [x] `docs/oauth-design.md` — OAuth architecture
- [x] `docs/partner-programs.md` — vendor partner research
- [ ] **Enable GitHub Pages** so the public docs URL resolves
- [ ] Update `openscaffoldlabs.com` privacy policy to mention the connector

### Brand assets (~80% complete)

- [x] `mcp/brand/openlawfirm-mcp-logo.svg` — 512×512 Electric Indigo logo
- [x] Logo design notes + PNG generation instructions in `mcp/brand/README.md`
- [ ] PNG variants generated (512, 256, 128, 64, 32)
- [ ] Favicon deployed at the MCP server's production domain
- [ ] At least 3 promotional screenshots (capture during demo recording)

### Policy / mailboxes (~40% complete)

- [x] `LICENSE` (MIT)
- [x] `SECURITY.md` — responsible disclosure policy
- [x] `CONTRIBUTING.md` — dev conventions
- [ ] **`security@openscaffoldlabs.com`** mailbox/Group created in Workspace
- [ ] **`support@openscaffoldlabs.com`** mailbox/Group created in Workspace

### Submission form (will fill once gating items are done)

See `mcp/SUBMISSION-CHECKLIST.md §5` for the complete field list. Most fields are derivable from existing docs.

---

## What's gating each next milestone

### To submit to the Connectors Directory (this week or next)

| Owner | Item | Estimate |
|---|---|---|
| **Dale** | Enable GitHub Pages on repo (Settings → Pages → `/docs` from `main`) | 5 min |
| **Dale** | Create `security@` and `support@openscaffoldlabs.com` Workspace Groups | 15 min |
| **Dale** | Create the `Open-Scaffold-Labs/openscaffold-oauth` GitHub repo, push the local repo | 5 min |
| **Matt** | Deploy `openscaffold-oauth` to `auth.openscaffoldlabs.com` (HTTPS, persistent JWKS, Postgres adapter) | ~1 day |
| **Matt** | Deploy `openlawfirm-mcp` to its production subdomain + TLS + favicon | ~half day |
| **Matt** | Deploy the OpenLawFirm API to its production subdomain | ~half day |
| **Dale or Matt** | Capture 5 promotional screenshots during the next clean demo run | 30 min |
| **Dale** | Fill submission form per `mcp/SUBMISSION-CHECKLIST.md §5` | 30 min |

### To start Sprint 3 live integrations (parallel to submission)

| Owner | Item | Lead time |
|---|---|---|
| **Dale** | Apply to iManage developer registration (`registration.imanage.com`) | 2–4 weeks for approval |
| **Dale** | Apply to NetDocuments ndConnect partner program | 2–3 weeks for approval |
| **Dale** | Create Box developer account | 1 day, free |
| **Matt or Claude** | Validate DocuSeal provider against a local Docker deployment | 1 hour once colima is running |

### To start design-partner outreach

| Owner | Item | Estimate |
|---|---|---|
| **Dale** | Identify 2 candidate firms from network (solo to 5-attorney CA shops) | ongoing |
| **Dale or Matt** | Record 5-minute demo video per `mcp/DEMO-SETUP.md` "Recording" section | 1–2 hours |
| **Dale** | Send the positioning one-pager + demo video to candidates | per outreach |

---

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Anthropic submission review rejects on missing annotations | 30% of submissions rejected for this reason | We've validated all 7 tools have `readOnlyHint` / `destructiveHint` — should be clean |
| Anthropic later ships their own SMB practice-management connector | Erodes our positioning | Build the deepest compliance moats (IOLTA, LEDES, jurisdiction rules) that horizontal AI vendors won't enter |
| Westlaw / LexisNexis MCP licensing forbids 3rd-party orchestration | Limits our marketing claims | Read their MCP terms before marketing "works with Westlaw/Lexis via Claude" |
| OAuth multi-prompt edge case in `test-e2e.js` | Currently blocks the full automated browser-flow test | Not blocking for Claude's real flow (which uses browser cookies); fix when relevant for CI |
| iManage / NetDocuments partner approval delays | Sprint 3 adapters can't be validated against live data | Skeleton code is ready; live testing can come post-v1.0 |

---

## Sessions to date

- **2026-05-19 — Sprint 1 + 2 + 3 + 4 (this session):** From scaffold + 2 commits + no README to a working demo-ready stack. ~8,000 lines of code and documentation across 3 repos.

(This is the only session so far. Future sessions appended here.)
