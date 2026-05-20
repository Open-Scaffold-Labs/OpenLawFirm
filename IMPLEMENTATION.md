# OpenLawFirm — Implementation Plan

**Author:** Dale Raaen (via Claude)
**Date:** 2026-05-19
**Status:** Draft v1 — for review with Matt and co-founders
**Repo:** [Open-Scaffold-Labs/OpenLawFirm](https://github.com/Open-Scaffold-Labs/OpenLawFirm)

---

## 1. Executive Summary

The *Fractured Law Firm* white paper (March 2026) established the thesis: small-to-midsize firms drown in 6+ disconnected tools, lose ~30% of billable time to friction, and pay $10K+/attorney/year for a tech stack that doesn't talk to itself. OpenLawFirm's answer is architectural — a single PostgreSQL database, a shared React component library (`@openscaffold/core`), and a standardized adapter layer (`@openscaffold/integrations`) — making the integration tax disappear at the data layer.

That thesis is still right. But the **release of Claude for Legal on May 12, 2026** — 20+ MCP connectors and 12 practice-area plugins, bundled into every paid Claude subscription — invalidates roughly half of what the white paper proposed to *build* and creates a new strategic surface: **OpenLawFirm should be both a consumer and a producer of MCP connectors.** The platform becomes more valuable, not less, when it's reachable from Claude.

This plan reconciles the white paper's four-phase roadmap with the new connector landscape, identifies which modules to build versus connect versus expose, and proposes a revised sequence that gets a defensible v1.0 in front of paying firms in ~6 months instead of the white paper's 8.

**Key strategic shift:** stop trying to out-build Westlaw / LexisNexis / DocuSign / iManage. Start *exposing OpenLawFirm's own data via MCP* so attorneys can drive the platform from Claude's chat surface and Claude can drive the platform from Microsoft 365. Practice management becomes the system of record; Claude becomes the universal interface.

---

## 2. What's Changed Since the White Paper

The white paper assumed OpenLawFirm needed to build most of its intelligence and integration layer in-house. Anthropic's May 12, 2026 release rearranges several assumptions.

### 2.1 New connectors directly relevant to the white paper

| Capability white paper assumed OpenLawFirm would build/wrap | Anthropic now ships as MCP connector |
|---|---|
| Legal research (RAG + AI alternative to Westlaw/Lexis) | LexisNexis (Lexis+ / Protégé) + Thomson Reuters Westlaw / CoCounsel |
| E-signature integration | DocuSign |
| Document management | iManage, Box |
| E-discovery | Everlaw |
| AI brief drafting / contract review / negotiation | 12 practice-area plugins (commercial, privacy, corporate, employment, M&A, etc.) |
| Cross-app document workflow | Microsoft 365 (Word + Outlook + Excel + PowerPoint, context-carrying) |
| Access-to-justice tooling | Courtroom5 (pro se litigants), BoardWise |

### 2.2 Adjacent shifts worth tracking

The 12 practice-area plugins each start with a **setup interview** that learns a team's playbooks, escalation chains, risk calibration, and house style. That means firms can configure Claude to their practice without anyone writing code — and OpenLawFirm's "AI Legal Assistant" module (white paper §50, Phase 3) no longer needs to do that work itself.

The **Microsoft 365 cross-app integration** matters because the average law-firm attorney lives in Word and Outlook. If Claude already carries context across those apps, OpenLawFirm doesn't need to rebuild a drafting surface — it needs to make sure its data is reachable from Claude when the attorney is in Word.

LexisNexis and Thomson Reuters **both** launched direct MCP integrations the day Anthropic announced. The legal-research-as-a-line-item cost concern from the white paper (§17–19) is now mitigated *not* by replacing those vendors but by reaching them through Claude at no incremental subscription cost beyond Claude itself.

### 2.3 What the white paper got right and still stands

The architectural thesis — one database, one component library, one adapter layer — remains the durable differentiator. None of Anthropic's connectors solve the integration tax *inside* a firm's practice management stack; they solve the integration tax across the firm's AI workflows. Those are different problems.

The compliance-grade modules — **trust accounting with three-way reconciliation, IOLTA, LEDES billing, UTBMS codes, six-minute time tracking, jurisdiction-aware deadline calculation** — are still core build items. Anthropic's connectors don't touch them. These are where OpenLawFirm earns the right to be the system of record.

---

## 3. Strategic Reframe: Build, Connect, or Expose

Every module in the white paper falls into one of three categories now:

**BUILD** — Core practice-management work that has no good external alternative and must be the system of record for a law firm. Compliance-bound, money-handling, and matter-state work all sit here.

**CONNECT** — Capability that exists as a high-quality external service that firms already pay for. OpenLawFirm consumes it via MCP (when the firm has it) rather than rebuilding it.

**EXPOSE** — OpenLawFirm's *own* data made reachable to Claude (and through Claude to Word, Outlook, Excel) via an MCP server we publish. This is the new category the white paper didn't anticipate.

### 3.1 Module-by-module decisions

| Module from white paper §50 | Decision | Rationale |
|---|---|---|
| Matter Management | **BUILD** | System of record. Central entity. No external substitute for the firm's matter graph. |
| Time & Billing (6-min increments, LEDES, UTBMS) | **BUILD** | Compliance-bound. Bar associations and clients require these standards. Anthropic doesn't touch billing semantics. |
| Trust Accounting (IOLTA, three-way reconciliation) | **BUILD** | Disbarment risk if mishandled. Must be tightly coupled to billing and matter data. |
| Document Engine (templates, clauses, OCR) | **BUILD core, CONNECT advanced** | Build template storage and clause library. Use Claude for drafting via M365 connector when firm has it. OCR via Tesseract.js per existing adapter. |
| E-Signatures | **CONNECT (DocuSeal default, DocuSign via Claude)** | White paper picked DocuSeal (open source) for self-host. Keep it. Firms on Claude with DocuSign can sign via Claude. Don't write our own signature flow. |
| Client Portal | **BUILD** | Secure messaging + invoice payment + document exchange = system of record for the firm-client relationship. No external substitute that respects privilege. |
| AI Legal Assistant | **EXPOSE + CONNECT, don't BUILD** | White paper assumed in-house RAGService. Replace with: (a) MCP server exposing OpenLawFirm data, (b) firms point their Claude at it, (c) Claude's practice-area plugins do the heavy AI work. We provide the data layer, Anthropic provides the cognition. |
| Calendar & Deadlines | **BUILD** | Jurisdiction-aware deadline rules are a domain moat. Bar-grievance risk if wrong. |
| Reporting & Analytics | **BUILD** | Realization, utilization, matter profitability — all derived from in-database data. No external substitute. |
| Legal Research | **CONNECT, don't BUILD** | White paper proposed "RAG + AI" to compete with Westlaw/Lexis. Reverse this: integrate via MCP so firms that have Westlaw/Lexis can use them from inside OpenLawFirm workflows via Claude. Don't try to win on case-law database completeness — we will lose. |
| Document Management (iManage/Box alternative) | **BUILD lite, CONNECT advanced** | Build storage of matter documents in `olf_documents` with version control. For firms on iManage or Box, expose a sync via MCP rather than asking them to migrate. |
| E-Discovery | **CONNECT only** | Everlaw via MCP. Too specialized to build. |

### 3.2 The new category: EXPOSE

This is the biggest strategic insertion. **OpenLawFirm should ship its own MCP server**, published the way Anthropic's 20+ connectors are published, that exposes:

- Matter lookup (by client, by attorney, by status)
- Time entry creation (so an attorney in Claude / Word can log time without leaving the chat)
- Document retrieval (matter-scoped, privilege-aware)
- Invoice status and trust balance queries
- Calendar deadline queries
- Client and contact search

That MCP server is what makes OpenLawFirm a first-class citizen of the Claude for Legal ecosystem. A firm using OpenLawFirm + Claude gets: Anthropic's 12 practice-area plugins + their existing Westlaw/Lexis subscriptions + DocuSign + iManage + **their own matters, time, and trust data** all in one Claude session.

Without this, OpenLawFirm is a great database with a React UI in a world that's increasingly orchestrated from chat. With it, OpenLawFirm becomes the firm's authoritative data layer behind the Claude orchestration.

---

## 4. Revised Phased Plan

The white paper had four phases: Foundation (M1-3), Documents/Signatures (M3-5), Intelligence (M5-8), Optimization (ongoing). The new sequence collapses the Intelligence phase (most of it is now an MCP server exposure plus configuration of Claude plugins) and pulls the MCP work earlier so that Phase 2 and Phase 3 ship a Claude-integrated product, not a standalone one.

### Phase 0 — Already done (per CLAUDE.md and repo state)

- Repo scaffolded with `client/` (React 19 + Vite + Tailwind) and `server/` (Express + Postgres direct queries).
- Database schema in `olf_*` tables: clients, matters, time entries, expenses, invoices, trust accounts, trust transactions, client trust ledger, documents, calendar events, contacts, billing rates, matter rates, payments, audit log, notifications, settings, plus UTBMS activity and task codes.
- API surface for auth, dashboard, clients, matters, time entries, invoices, trust, calendar, settings.
- Three demo users (attorney / associate / paralegal).
- Shared `@openscaffold/core` and `@openscaffold/integrations` packages linked via `file:` refs.

This is genuinely substantial. Most of the white paper's Phase 1 schema work is done. What's missing is the UX polish, the business logic for the harder workflows (three-way reconciliation, LEDES export, deadline rules), and the MCP layer.

### Phase 1 — Foundation Hardening (Months 1–2)

**Goal:** Move from "demo data works" to "a real firm could put a real matter in this and not lose money."

Deliverables:

- Three-way reconciliation working end-to-end with a real bank statement CSV import, the trust ledger, and the per-client sub-ledgers. Visible "out of balance" alerts. Audit trail of every reconciliation.
- LEDES 1998B and LEDES 2000 invoice export. UTBMS code coverage check on every time entry before invoice generation.
- Six-minute increment time entry with one-click timer start/stop. Today summary view. Approval flow.
- Conflict-check workflow on new client / new matter creation that searches across clients, opposing parties, and prior matters.
- Migration tooling to import clients, matters, and historical time entries from CSV (positioning for Clio / PracticePanther / Smokeball exports).
- Test harness with at least 80% coverage on routes that touch money.

What we do **not** do in Phase 1: AI, document automation, e-signature, client portal. Those are Phase 2 and 3.

### Phase 2 — MCP-First Document and Signature Workflow (Months 2–4)

**Goal:** Ship the document and signature workflows with Claude integration baked in from day one, not bolted on later.

Deliverables:

- Document template library: `.docx` templates with merge fields keyed off matter and client data. Use the openscaffold-core document standards (Electric Indigo title block, Times New Roman 11pt, navy headings).
- Template rendering pipeline: matter + client + custom fields → filled `.docx` → PDF via the existing `PDFBuilder` adapter.
- Clause library: snippets attached to practice areas, retrievable by tag.
- DocuSeal integration via the `SignatureService` adapter (open source default).
- Client portal v1: secure login (separate auth surface from internal staff), document view + download, invoice view + payment via Stripe Connect, secure messaging tied to matter.
- **MCP Server v1**: a `openlawfirm-mcp` package that exposes matter search, time entry creation, document retrieval, and invoice/trust status as tools Claude can call. Publish to Anthropic's connector registry. This is the unlock for everything in Phase 3.

By end of Phase 2, a firm could plausibly run small matters end-to-end on OpenLawFirm.

### Phase 3 — Claude-Driven Intelligence (Months 4–6)

**Goal:** Replace the white paper's in-house AI Legal Assistant module with a configuration story. Firms point their Claude (Cowork / Claude for Legal) at OpenLawFirm's MCP server, and the intelligence comes from Claude + Anthropic's 12 practice-area plugins.

Deliverables:

- **OpenLawFirm Skill** published to Anthropic's marketplace: a Claude skill that knows the OpenLawFirm domain (matters, time, trust, billing) and walks attorneys through common workflows (log time from a phone call, draft a status letter to a client, prep for a hearing).
- **Setup wizard** for firms onboarding to Claude for Legal: detects their Claude subscription, prompts them to install the OpenLawFirm connector, walks them through the practice-area plugin selection (commercial, employment, M&A, etc.) that matches their book of business.
- **Jurisdiction-aware calendar / deadline engine**: encode statute-of-limitations rules per jurisdiction and practice area; surface them through both the OpenLawFirm UI and the MCP server so Claude can answer "when does X need to be filed?" from natural language.
- **Realization and utilization dashboard** for managing partners: pulls from time entries, invoices, and payments. Built on existing `queryBuilder` + `DataTable`.
- **Reporting & analytics exports**: monthly firm summary as `.docx` and `.xlsx` per the openscaffold-core document standards.

By end of Phase 3 we have something defensible to sell to a real firm: practice management of record + Claude orchestration + their existing legal research and signature subscriptions all in one workflow.

### Phase 4 — Practice-Area Verticals and Optimization (Months 6+)

**Goal:** Extend OpenLawFirm into specific practice areas that are underserved by Anthropic's 12 plugins, and continuously tune.

Candidates (pick 1–2 to start, validate with design partners):

- **Personal injury**: settlement waterfall, lien tracking, contingency fee math, demand letter automation. High-volume small firms.
- **Family law**: hearing tracking, parenting plan templates, support calculation worksheets, court-ordered discovery automation.
- **Real estate / closings**: closing checklist, title report intake, settlement statement (HUD-1 / CD) generation, IOLTA escrow with high transaction volume.
- **Immigration**: USCIS form automation, case status polling, deadline calendaring against priority dates.

Each practice-area vertical ships as a plugin on top of OpenLawFirm core, with its own UI surfaces and its own MCP tool extensions.

Also in Phase 4: continuous tuning of billing realization workflows, expansion of the openscaffold-core knowledge base from real firm data, contribute custom adapters back to `@openscaffold/integrations`.

---

## 5. Open Decisions and Risks

### 5.1 Decisions that need answers before Phase 2 starts

- **Hosting model.** Self-hosted (firm runs Postgres on their own infra), single-tenant SaaS (one DB per firm, we manage), or multi-tenant (one DB, schema-isolated)? The white paper is ambiguous. Multi-tenant is faster to ship but creates compliance complexity (some bar opinions disfavor commingled storage of client data). Recommendation: single-tenant SaaS per firm with optional self-host. Validate with two design-partner firms.
- **Pricing.** White paper benchmarks against $10K/attorney/year incumbents but doesn't propose a number. Recommendation: $99/user/month with Trust Accounting and MCP Server included. Compare to Clio Suite ($139/user/month for similar surface). The Claude subscription is purchased separately by the firm — we don't bundle it.
- **What does "shared DB" mean in production?** CLAUDE.md says all Open Scaffold apps share `postgresql://[user]@localhost:5432/openfirehouse`. That works for local dev. In production we need a decision: one DB per ecosystem deployment, or each customer firm gets its own ecosystem instance? Strongly leaning toward the latter for legal — the regulatory surface is too sharp for shared.
- **Conflict-check graph.** Bare-minimum is text search across client, party, and matter names. Better is a graph of related parties (spouses, business affiliates, prior matters). Decide scope before Phase 1 ships.

### 5.2 Risks to flag

- **Anthropic could go further into legal practice management.** The 12 practice-area plugins are workflow-level today. If Anthropic ships a "matters" or "billing" plugin in 12 months, our position weakens. Mitigation: build deep compliance moats (IOLTA, LEDES, jurisdiction rules) that are unattractive for a horizontal AI vendor to enter. Be the system of record they connect *into*, not a thin orchestration layer they replace.
- **Bar admission rules on cloud / AI use.** Several states have ethics opinions about AI in legal work, and some require specific disclosures, audit trails, and human-in-loop review. Need to enumerate the requirements per target jurisdiction before Phase 3 ships AI-driven workflows. Recommendation: bake an "AI activity log" into the `olf_audit_log` table that captures every Claude-driven action with attorney attestation.
- **Westlaw / LexisNexis MCP terms.** Both have direct MCP connectors now, but the licensing terms for using those connectors via a third-party platform (OpenLawFirm orchestrating Claude orchestrating Westlaw) are not yet clear. Need to read their MCP terms-of-service carefully before marketing the integration. Worst case: firms still subscribe to Westlaw/Lexis directly and use them through Claude alongside OpenLawFirm — fine, but means we don't get to feature it in our marketing.
- **OpenFirehouse migration overhang.** The GitHub Identity Consolidation white paper flags that OpenFirehouse needs to be transferred from `draaen-jpg` to `Open-Scaffold-Labs` before broader infrastructure work scales. If the shared Postgres DB strategy survives, this migration affects OpenLawFirm too. Address as a prerequisite, not a parallel.

### 5.3 Things to validate with design-partner firms

- Will solo and 2–5 attorney firms actually pay a Claude subscription separately? If not, we need a path for them that doesn't depend on it (the v1 product without the MCP layer still has to be valuable).
- Do 10–50 attorney firms want self-hosted, or are they comfortable with SaaS now? The white paper's open-source / no-lock-in pitch implies self-hosted; modern firms increasingly prefer not to run servers.
- Are jurisdiction-specific deadline rules a deciding factor, or table stakes? If table stakes, we need them in Phase 1, not Phase 3.

---

## 6. Immediate Next Actions (this week and next)

**Engineering (Matt + Dale)**

1. Land the three-way reconciliation prototype in `server/src/routes/trust.js`. Test against a hand-crafted CSV of bank statement, deposits, and per-client ledger. Two days of focused work.
2. Stand up the `openlawfirm-mcp` package skeleton. Even a no-op MCP server with three tools (matter search, time entry create, invoice status) is enough to start integration testing with Claude. Half a day.
3. Wire LEDES 1998B export against the existing `olf_invoices` and `olf_invoice_line_items` tables. The format is fixed and well documented. One day.
4. Migrate OpenFirehouse from `draaen-jpg` to `Open-Scaffold-Labs` per the GitHub Identity Consolidation white paper. One hour, blocks future ecosystem work.

**Business / strategy (Dale)**

1. Identify two design-partner firms (likely from your existing network — solo or 2-5 attorney shops in California). Get a 30-min call with each to validate the build / connect decisions in §3.1.
2. Read the LexisNexis and Thomson Reuters MCP connector terms of service (links in §8 below). Confirm we can market "works with Westlaw / Lexis via Claude" before the v1 launch.
3. Decide the hosting model (single-tenant SaaS recommended). This blocks the production deployment work.
4. Decide the pricing model. $99/user/month is a defensible anchor; validate.
5. Start the GitHub Open Source release prep — MIT license file in repo root, contributing guide, security policy, and (eventually) a public-facing README. The white paper's open-source pitch is undermined as long as the repo has zero of these.

**Both**

1. Draft a one-page positioning doc: "OpenLawFirm + Claude for Legal — how a 10-attorney firm runs their practice." Use to validate with design partners and to seed marketing copy.

---

## 7. Success Metrics for v1.0 (end of Phase 3)

- **Functional**: One full month of real practice-management workflow run by a design-partner firm, including bank reconciliation, LEDES invoice export, trust deposit/disbursement, and at least 50 time entries logged.
- **Compliance**: Zero IOLTA reconciliation discrepancies. Audit log captures every money-touching action.
- **Integration**: At least three Claude-driven workflows demonstrably working through the OpenLawFirm MCP server (log time from natural language, draft a client status letter, pull next-week deadlines for a matter).
- **Adoption signal**: At least one firm willing to pay $99/user/month after a 30-day free trial.

---

## 8. References

- *The Fractured Law Firm* — OpenLawFirm Whitepaper (Open Scaffold Labs, March 2026)
- *GitHub Multi-Identity Consolidation* — Open Scaffold Labs Whitepaper (March 2026)
- [Open-Scaffold-Labs/OpenLawFirm](https://github.com/Open-Scaffold-Labs/OpenLawFirm) (CLAUDE.md)
- [Anthropic Goes All-In on Legal — LawSites (May 12, 2026)](https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude.html)
- [Claude for Legal: What the industry needs to know — Legal IT Insider (May 13, 2026)](https://legaltechnology.com/2026/05/13/claude-for-legal-what-the-industry-needs-to-know/)
- [LexisNexis integrates Anthropic's Claude Legal Plugin Suite](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-expands-lexis-with-protege-by-integrating-anthropics-claude-legal-plugin-suite)
- [Two Legal Research Providers Launch MCP Integrations with Claude — LawSites](https://www.lawnext.com/2026/05/two-legal-research-providers-launch-mcp-integrations-with-claude-thomson-reuters-and-free-law-project-connect-their-data-to-ai.html)
- [Anthropic Pushes Deeper Into Legal Work With Claude Updates — Bloomberg Law](https://news.bloomberglaw.com/legal-ops-and-tech/anthropic-pushes-deeper-into-legal-work-with-claude-updates)
- [TechCrunch: AI legal services industry is heating up](https://techcrunch.com/2026/05/12/the-ai-legal-services-industry-is-heating-up-anthropic-is-getting-in-on-the-action/)
