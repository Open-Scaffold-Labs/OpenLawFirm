# OpenLawFirm Connector Integration Matrix

**Status:** Draft v1 · 2026-05-19
**Source of truth:** [Claude for the legal industry — Anthropic blog (May 12, 2026)](https://claude.com/blog/claude-for-the-legal-industry)

This document catalogs every MCP connector and practice-area plugin in Anthropic's Claude for Legal launch and assigns OpenLawFirm's response to each. It complements [IMPLEMENTATION.md](./IMPLEMENTATION.md) by translating the BUILD / CONNECT / EXPOSE framework into a concrete per-connector punch list.

## 1. Strategic frame

OpenLawFirm interacts with Anthropic's legal ecosystem in four ways:

- **EXPOSE** — We publish an MCP server (`openlawfirm-mcp`) to Anthropic's Connectors Directory. This is the unique strategic insertion. Other practice management vendors have not done this.
- **CONNECT-native** — We build an adapter in `@openscaffold/integrations` that OpenLawFirm uses directly, without requiring the firm to route through Claude. Reserved for services the firm needs whether or not they're on Claude.
- **CONNECT-via-Claude** — We don't build anything. The firm reaches the service through Claude when needed. OpenLawFirm provides the data; Claude provides the orchestration.
- **DEFER** — Not relevant for v1.0. Document the decision so we don't re-litigate it.

The 12 practice-area plugins are Claude-side configuration, not OpenLawFirm code. Our job is to document which plugin pairs with which OpenLawFirm workflow and bake that into the Phase 3 setup wizard.

## 2. Headline finding: the SMB practice management slot is empty

Anthropic's launch included no connectors for the dominant small-firm practice management systems: **Clio, PracticePanther, Smokeball, MyCase, LEAP, Litify, CosmoLex, Rocket Matter — none of them.** Nor for the SMB-friendly billing and accounting tools (TimeSolv, Bill4Time, LeanLaw, TrustBooks). Nor for jurisdiction-specific deadline tools (CalendarRules, ProLaw deadlines).

This is the exact slot OpenLawFirm occupies. The strategic move is clear: **publish `openlawfirm-mcp` quickly and become the canonical SMB practice management connector in the Claude for Legal ecosystem.** First-mover advantage matters here because Anthropic's directory rewards depth of integration, and once a firm has wired their workflows around a particular MCP server, switching costs accrue.

## 3. Connector catalog and decisions

Connectors are organized by Anthropic's own categorization in the May 12 announcement. Decision column uses the framework above.

### 3.1 Contract lifecycle and drafting

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Definely** | Live deterministic access to contract structure: definitions, cross-references, dependencies, structural diffs | CONNECT-via-Claude | Transactional/corporate work. Out of v1.0 SMB scope. Firms doing M&A reach it through Claude. |
| **Docusign** | Agreement data, terms surfacing, workflow orchestration through full contract lifecycle | CONNECT-via-Claude (with DocuSeal as native default) | Build DocuSeal (open source) as our native signature service per the white paper. Firms on DocuSign reach it via Claude. |
| **Ironclad** | Contract repository + workflows, permission-scoped natural-language queries | DEFER | CLM is enterprise legal, not SMB. Not a v1.0 priority. |

### 3.2 Deal rooms and transaction documents

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Box** | Content storage, search, query, metadata extraction with Box security/access policy enforcement | CONNECT-native (adapter) | Box is widely used in 1-50 atty firms as a Dropbox alternative. Build an `@openscaffold/integrations` adapter so OpenLawFirm can attach Box documents to matters directly, no Claude required. |
| **Datasite** | M&A virtual data room — folder structure, user invitations, buyer Q&A tracking | DEFER | M&A-specific. Not a v1.0 SMB workflow. |

### 3.3 Document management

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **iManage** | Permission-bound access to matter history, documents, institutional knowledge | CONNECT-native (adapter) | iManage dominates mid-market law firms. Build the adapter so OpenLawFirm can act as a thin practice-management layer over an existing iManage deployment without forcing migration. |
| **NetDocuments** | Search, retrieve, draft based on precedents, with permission enforcement | CONNECT-native (adapter) | Same logic as iManage. Combined, iManage + NetDocuments cover ~80% of mid-market firms with existing DMS. We need both. |

### 3.4 Expert networks and skills

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Lawve AI** | Curated legal AI skills library, searchable from Claude | CONNECT-via-Claude | Skills marketplace. Firms install Lawve skills directly. We can publish our own OpenLawFirm skills *to* Lawve in Phase 3. |
| **The L Suite (Lloyd)** | Braintrust member platform connector for L Suite members | DEFER | In-house counsel community tool. Not SMB practice-management relevant. |
| **The L Suite (TopCounsel)** | Find outside counsel via L Suite's proprietary dataset and ranking | DEFER | In-house counsel referral network. Not SMB practice-management relevant. |

### 3.5 E-discovery and review

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Consilio** | Live matters + Consilio's Aurora Legal AI, permission-scoped | CONNECT-via-Claude | E-discovery is BigLaw / litigation-specialty. SMB firms outsource e-discovery. Reach via Claude when needed. |
| **Everlaw** | Litigation platform — search, organize, retrieve from Everlaw projects with direct review links | CONNECT-via-Claude | Same logic — SMB firms running Everlaw are unusual. When they exist, Claude is the bridge. |
| **Relativity** | RelativityOne workspace setup, schema, access control, usage analytics | DEFER | Enterprise litigation only. Not SMB. |

### 3.6 Fiduciary-grade workflows

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Thomson Reuters / CoCounsel Legal** | End-to-end drafting, research, review, validation grounded in Westlaw, Practical Law, KeyCite | CONNECT-via-Claude | The single most important legal research connector. Many SMB firms already pay for Westlaw. Reach via Claude — never try to replace this. |

### 3.7 Legal research and case law

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Legal Data Hunter** | 31M+ docs from 160+ jurisdictions; EU consolidated law, supreme/constitutional court case law | CONNECT-via-Claude | International legal research. Useful for the small number of SMB firms with cross-border practice. Claude is the bridge. |
| **Midpage** | Case law database with hyperlinked sources for verification | CONNECT-via-Claude | Solid Westlaw/Lexis alternative for budget-conscious firms. Worth featuring in our marketing as a "you don't need Westlaw if you have Claude + Midpage" angle. |
| **Trellis** | Largest US state trial-court dataset — dockets, rulings, verdicts, judge/opposing-counsel analytics | CONNECT-via-Claude | Excellent for litigation prep. Pair with the Litigation Legal plugin in our recommended setup for PI/litigation firms. |
| **LexisNexis (Lexis+ / Protégé)** | Legal research — third-party MCP, announced May 13, 2026 (one day after Anthropic launch) | CONNECT-via-Claude | LexisNexis built and announced their own connector independently. Same posture as Westlaw — reach via Claude. |

### 3.8 Legal AI assistants

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Harvey** | Legal intelligence, Vault projects, research over selected knowledge sources | CONNECT-via-Claude | Harvey is positioned for BigLaw. Unlikely to be in our SMB firms' stack. Document the integration path for the few that have it. |
| **Solve Intelligence** | Patent + non-patent literature, SEP technical standards, prior-art search, claim mapping | DEFER | Patent-specific. Out of SMB practice management scope. |

### 3.9 Public service / access to justice

| Connector | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **BoardWise** | Licensed professional state board matters — deadlines, response letter drafting | CONNECT-via-Claude | Useful for solo practitioners taking professional discipline cases. Document but don't integrate. |
| **Courtroom5** | Pro se litigant guidance across all 50 states — case intake, deadline calculation | CONNECT-via-Claude | Useful for legal aid clinics. Worth a callout in our marketing for the access-to-justice angle. |
| **Descrybe** | Primary law tools — case search, treatment status, citing authorities, quote verification | CONNECT-via-Claude | Free, useful, low integration effort. Good default research surface for solo firms. |
| **Free Law Project (CourtListener)** | US court opinions, PACER dockets, judge profiles, oral arguments, citations | CONNECT-via-Claude | Free, comprehensive, no subscription cost. The right default for cost-conscious SMB firms. Mention prominently in marketing. |

### 3.10 Microsoft 365 cross-app integration

| Surface | What it does | OpenLawFirm response | Rationale |
|---|---|---|---|
| **Word** | Drafting, redlining, clause-by-clause comparison against playbooks; comment scrubbing; formatting checks | CONNECT-via-Claude (critical for Phase 2+ demo) | The single most important demo surface. SMB attorneys live in Word. Phase 2 demo must show Claude drafting in Word with OpenLawFirm matter context. |
| **Outlook** | Triages incoming matter work; flags contract requests; drafts cover notes; schedules follow-ups | CONNECT-via-Claude | Important for the time-tracking demo (Claude logs time from an email reply via openlawfirm-mcp). |
| **Excel** | Cross-app context for closing checklists, financial summaries | CONNECT-via-Claude | Useful but not a primary OpenLawFirm workflow. |
| **PowerPoint** | Board summaries carrying context from Word/Outlook | DEFER | Out of SMB practice scope. |

## 4. Practice-area plugins (12 total — all Claude-side, all open source)

The 12 plugins are not OpenLawFirm code. They're [Anthropic-published](https://github.com/anthropics/claude-for-legal) Claude plugins. Each starts with a setup interview that learns the firm's playbook, escalation chain, risk calibration, and house style.

OpenLawFirm's role: in the Phase 3 setup wizard, recommend which plugin(s) to install based on the firm's practice areas (captured during initial matter taxonomy setup).

| Plugin | Best paired with OpenLawFirm workflows | Recommend to firms practicing |
|---|---|---|
| Commercial Legal | Matter management, document engine, e-sig | General business law, transactional |
| Corporate Legal | Document engine, matter management | M&A, board work, entity compliance — likely out of SMB scope |
| Employment Legal | Matter management, document engine, calendar | Employment defense, plaintiff-side employment, HR counsel |
| Privacy Legal | Document engine, matter management | Privacy compliance, data protection counsel |
| Product Legal | Document engine | In-house product counsel — out of SMB scope |
| Regulatory Legal | Calendar/deadlines, matter management | Regulatory compliance counsel, lobbying-adjacent practice |
| AI Governance Legal | Document engine | Emerging — recommend to tech-sector advisors |
| IP Legal | Matter management, document engine, calendar | Trademark, copyright, trade secret practices |
| Litigation Legal | Matter management, calendar, document engine, trust accounting | Personal injury, civil litigation, family law, criminal defense |
| Law Student | (none — bar prep tool) | Recommend to associates / paralegals studying for bar |
| Legal Clinic | Matter management, calendar, client portal | Legal aid clinics, law school clinics |
| Legal Builder Hub | (none — infrastructure for custom skills) | Firms building their own skills on top of OpenLawFirm |

**Phase 3 setup wizard logic:** when onboarding a firm, capture practice areas from the matter taxonomy. Recommend the corresponding plugins. Provide one-click install links to the Anthropic Legal Marketplace.

## 5. The OpenLawFirm MCP server (`openlawfirm-mcp`)

This is the **single highest-priority engineering item** for OpenLawFirm in light of the Claude for Legal launch. The goal is to publish a connector to the Anthropic Connectors Directory that exposes OpenLawFirm's data to Claude.

### 5.1 Tool surface for v0.1

The v0.1 server should expose six tools — bounded, well-named, with proper annotations. (Per Anthropic's directory guidance, missing `readOnlyHint` / `destructiveHint` annotations cause ~30% of submission rejections.)

| Tool | Annotation | What it does |
|---|---|---|
| `matter_search` | readOnly | Search matters by client name, attorney, status, practice area, or open text. Returns matter ID, name, client, responsible attorney, status. |
| `matter_get` | readOnly | Retrieve full matter detail including parties, key dates, recent activity, documents. |
| `time_entry_create` | destructive (creates state) | Create a time entry: matter ID, attorney ID, hours (in 0.1 increments), LEDES activity code, narrative. Returns entry ID + confirmation. |
| `document_search` | readOnly | Search documents within a matter scope by filename, date, document type, or full-text. Returns metadata + URL. |
| `invoice_status` | readOnly | Query invoice status for a matter or client. Returns invoice ID, amount, status, outstanding balance, last payment date. |
| `trust_balance` | readOnly | Query trust account balance for a client or matter. Returns balance, last reconciliation date. |
| `calendar_query` | readOnly | Query upcoming deadlines, hearings, statutes of limitations within a matter or attorney scope. |

Seven tools, actually — added `calendar_query` because deadline visibility is a top-three reason attorneys reach for Claude. Worth the small additional scope.

### 5.2 Auth model

OAuth 2.0 with PKCE, per Anthropic Connectors Directory requirements. The OpenLawFirm authentication system (JWT + bcrypt per CLAUDE.md) needs to grow an OAuth surface for this. **Phase 2 prerequisite.** Don't start the MCP server work until the OAuth surface is in place — Anthropic will reject the submission without it.

### 5.3 Hosting

Remote MCP server (HTTPS endpoint), not local. Required by Anthropic for directory inclusion. Deploy alongside the production OpenLawFirm API.

### 5.4 Permissions

Every tool response must respect the user's matter access. An attorney querying matters via Claude should only see matters they're authorized to see in the OpenLawFirm UI. This means the MCP server enforces the same access control as `/api/matters`, etc. — likely by routing through the same auth middleware.

### 5.5 Submission requirements (from Anthropic)

For directory inclusion, we need:

- Server logo + favicon verification
- Public documentation URL by the submission date
- OAuth 2.0 with PKCE
- HTTPS-only
- Origin-header validation
- `readOnlyHint` / `destructiveHint` annotations on every tool
- Policy & requirements compliance checklist
- Promotional screenshots for the MCP Apps surface

Submission is a manual review process — typically 2-4 weeks based on community reports. Submit early in Phase 2 to ensure approval by end of Phase 2.

## 6. The demo path

The recommended 7-piece demo for a design-partner conversation with a small litigation firm:

1. **`openlawfirm-mcp`** — Claude queries matters, creates time entries, checks trust balances
2. **`@openscaffold/integrations` DocuSeal adapter** — engagement letter routed for signature from inside Claude
3. **NetDocuments OR iManage** (whichever the firm uses) — Claude reaches existing matter documents
4. **Microsoft Word** integration — Claude drafts a demand letter in Word with OpenLawFirm matter context (medical records, prior settlements via the firm's knowledge base)
5. **Thomson Reuters CoCounsel** (or Free Law Project for cost-conscious firms) — Claude pulls case authority while drafting
6. **Litigation Legal plugin** — runs in the background, handling chronology, deposition prep, brief drafting workflows
7. **`security@openscaffoldlabs.com` group set up** — minor but visible: shows we have security infrastructure in place

The demo narrative: a 10-attorney PI firm walks through their morning — deadline review, client call → time entry, demand letter drafting in Word with research and prior-settlement context, signature routing, new client intake with conflict check and IOLTA deposit. The whole flow takes 5-6 minutes to demonstrate.

## 7. Engineering sequence

Recommended order, building toward the demo:

### Sprint 1 (week 1-2) — Foundation

1. Add OAuth 2.0 with PKCE to the OpenLawFirm auth surface. Required for `openlawfirm-mcp` submission.
2. Land three-way IOLTA reconciliation prototype (Phase 1 of IMPLEMENTATION.md).
3. Land LEDES 1998B invoice export.
4. Migrate OpenFirehouse to Open-Scaffold-Labs (per the GitHub Identity Consolidation white paper) so the shared-DB strategy is unblocked.

### Sprint 2 (week 3-4) — MCP server v0.1

5. Scaffold `openlawfirm-mcp` as a new package in the Open-Scaffold-Labs ecosystem. Use the [Anthropic remote MCP server SDK](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers).
6. Implement the 7 tools listed in §5.1. Each tool routes through the same auth middleware as the corresponding REST route.
7. Deploy to a staging environment. Test against Claude Cowork manually.
8. Prepare directory submission package: logo, screenshots, public docs at `openscaffoldlabs.com/mcp/openlawfirm` or similar.
9. Submit to the Anthropic Connectors Directory.

### Sprint 3 (week 5-6) — Native CONNECT adapters

10. Build the DocuSeal adapter in `@openscaffold/integrations` (signature service, white paper default). Wire to engagement letters and retainer agreements.
11. Build the Box adapter in `@openscaffold/integrations`. Allow attaching Box-hosted documents to matters.
12. Build the iManage adapter. Same pattern as Box.
13. Build the NetDocuments adapter. Same pattern.
14. Each adapter ships with a test harness that uses the vendor's sandbox/test API.

### Sprint 4 (week 7-8) — Demo readiness

15. Stand up a demo OpenLawFirm instance with realistic seed data — 8-10 matters, 50+ time entries, 3-5 documents per matter, IOLTA balances, calendared deadlines.
16. Pair openlawfirm-mcp with the Litigation Legal plugin (or whichever practice area matches the demo firm) and validate the workflows from §6.
17. Record a 5-minute demo video for the design-partner outreach.
18. Update the README and IMPLEMENTATION.md with the MCP server submission status.

By end of Sprint 4 (week 8, ~2 months from now), we have a demo-ready product. That's when design-partner outreach begins.

## 8. What we don't build

The matrix above implicitly defers these things. Calling them out for clarity:

- **No native Westlaw / LexisNexis / CoCounsel adapter.** All legal research goes through Claude. We are not entering the legal research market.
- **No native DocuSign adapter.** DocuSeal is our native default; firms with DocuSign reach it via Claude.
- **No native e-discovery integration.** Out of SMB practice scope.
- **No native CLM integration (Ironclad, Definely).** Out of SMB practice scope.
- **No PowerPoint integration.** Out of SMB practice scope.
- **No native Harvey, Solve Intelligence, or BigLaw-tier AI assistant integration.** Out of SMB practice scope.
- **No data room (Datasite) integration.** Out of SMB practice scope.

Each of these decisions is reversible if a design-partner firm asks for it specifically. But by default, the v1.0 surface area is bounded by what's listed in §3 and §7.

## 9. Open questions before sprint 1 starts

1. **OAuth surface design.** Where does the OAuth authorization server live — embedded in the OpenLawFirm Express app, or a separate `openscaffold-oauth` service shared across the ecosystem? Recommend the latter to avoid each vertical reimplementing OAuth.
2. **MCP server hosting.** Same VM as the OpenLawFirm API, or its own deployment? Recommend its own subdomain (e.g., `mcp.openlawfirm.com`) for clean separation and clearer rate limiting.
3. **Logo and brand for the MCP server entry.** The Open Scaffold Labs brand (Electric Indigo `#4F46E5`) is the obvious choice. Need a 512px square logo committed to `openscaffold-core/brand/` before submission.
4. **Sandbox accounts.** For testing the iManage, NetDocuments, Box, DocuSeal, and Thomson Reuters adapters, we need sandbox or test accounts with each vendor. Box and DocuSeal are easy (free tiers exist). iManage and NetDocuments require partner-program signup. Thomson Reuters is the hardest — likely needs a sales conversation. Start the iManage and NetDocuments partner outreach in Sprint 1.

## 10. References

- [Claude for the legal industry — Anthropic blog (May 12, 2026)](https://claude.com/blog/claude-for-the-legal-industry)
- [Anthropic Connectors Directory — submission guide](https://claude.com/docs/connectors/building/submission)
- [Anthropic Connectors Directory FAQ](https://support.claude.com/en/articles/11596036-anthropic-connectors-directory-faq)
- [Remote MCP servers — Claude API docs](https://docs.anthropic.com/en/docs/agents-and-tools/remote-mcp-servers)
- [claude-for-legal GitHub repo (the 12 plugins, open source)](https://github.com/anthropics/claude-for-legal)
- [Claude Connectors Directory (live)](https://claude.ai/directory/connectors)
- [LexisNexis Lexis+ Protégé integration (May 13, 2026)](https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-expands-lexis-with-protege-by-integrating-anthropics-claude-legal-plugin-suite)
- [Anthropic Goes All-In on Legal — LawSites (May 12, 2026)](https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude.html)
