# OpenLawFirm — Session Wrap, 2026-05-21

This is what landed overnight while you slept, in roughly the order
you'd care about it the morning after.

---

## TL;DR

**Every entity in the app has working CRUD.** The OpenLawFirm React
client went from "list views with decorative + buttons" to "fully
operational practice management UI" — matters, clients, time entries,
expenses, contacts, documents, calendar events, trust transactions,
and invoices all create / edit / delete (where appropriate) through
modal forms wired to real API routes.

**The architectural thesis is now visible in the code.** OpenLawFirm
uses shared modules from `@openscaffold/core` for:
- Number generation (invoice + matter numbers)
- PDF generation (invoice PDFs via Python/reportlab, same pattern as
  proposals in the estimating module)
- DataTable (list views — Matters, Clients, TimeEntry, Billing all
  use the shared component now)

**LEDES 1998B invoice export is live** with proper UTBMS task codes
backfilled in the seed.

**A managing-partner Utilization dashboard** rolls up firm-wide hours,
per-attorney utilization vs. target, AR aging buckets, and top
matters by hours — all from a single new `/api/analytics/utilization`
endpoint.

---

## What's running locally right now

| Service | Port | Notes |
|---|---|---|
| PostgreSQL `openfirehouse` | 5432 | 21 `olf_*` tables, realistic seed |
| OpenLawFirm API | 3024 | Express server, all routes live |
| `openscaffold-oauth` | 4000 | Node + node-oidc-provider, PKCE enforced |
| `openlawfirm-mcp` | 3825 | MCP server with 7 tools |
| OpenLawFirm React client | 5192 | Vite dev, HMR active |

Open http://localhost:5192 and sign in as `attorney` / `lawfirm1234`
(or `associate`, `paralegal`, same password).

---

## What you can do in the UI now

Every page has working create / edit / delete unless explicitly
deferred:

### Matters
- New / Edit matter (with server-generated matter number suggestion)
- Click row → matter detail
- Status filter pills
- DataTable: sortable headers, search across matter_number / title
  / client / practice area / attorney, pagination at 25 / page

### Matter detail
- Edit button on every matter (pencil icon)
- **Overview** — full matter card
- **Time entries** — read-only list (CRUD happens on the Time & Billing page)
- **Expenses** — full CRUD (add / edit / delete, with billable +
  status). Delete blocked when billed_on_invoice_id is set.
- **Documents** — metadata CRUD (filename / type / size / category /
  description). Physical bytes deferred to DocumentStore adapter
  wiring; UI notes that explicitly.
- **Contacts** — full CRUD with role taxonomy (opposing counsel,
  witness, expert, court clerk, co-counsel, mediator, investigator,
  other)

### Clients
- New / Edit (click any row), individual vs. company toggle
- DataTable with search on name / email / phone

### Time & Billing
- New / Edit / Delete (draft entries only) / Approve
- Per-row + header checkbox for bulk approve
- "Approve N selected" button appears when selection is non-empty
- Today's summary stat cards
- DataTable with search across matter / timekeeper / description /
  activity code, pagination at 50

### Trust / IOLTA Accounts
- Green Deposit + amber Disbursement buttons
- Transactions immutable per audit requirements (warning shown in
  form)
- Tabs for accounts / transactions / client ledger / reconciliation

### Calendar
- New / Edit / Delete events
- Filter pills (all / hearing / deadline / meeting)
- Court date flag with red border

### Invoices
- Generate Invoice from any matter (consumes approved unbilled time
  entries)
- Per-row actions: **PDF** (Python+reportlab, brand-colored,
  letterhead + bill-to + line items + payments + balance due) and
  **LEDES** (download .ledes file, 24-field 1998B spec, populated
  UTBMS task + activity codes, timekeeper classification)
- Send / Record payment / Mark paid status flow

### Utilization (new)
- Window selector (7 / 30 / 90 / 365 days)
- Target billable hours/day setting
- Firm-wide cards: total hours, WIP value, trust balance, outstanding AR
- AR aging: current / 30 / 60 / 90+ buckets
- Per-attorney utilization with colored progress bars (red < 50%,
  amber 50–69%, indigo 70–89%, emerald 90%+)
- Top 10 matters by hours, click to navigate

### Integrations (Settings → Integrations)
- Live health check of the `openlawfirm-mcp` server
- Document storage / e-sig / legal research / practice-area plugin
  reference, with BUILD / CONNECT / EXPOSE framework made visible

---

## What's running in the background that you should know about

### Three open-source repos on GitHub

- [Open-Scaffold-Labs/OpenLawFirm](https://github.com/Open-Scaffold-Labs/OpenLawFirm) — the platform
- [Open-Scaffold-Labs/openscaffold-integrations](https://github.com/Open-Scaffold-Labs/openscaffold-integrations) — DocumentStore + SignatureService + DocuSeal + Box + iManage + NetDocuments providers
- [Open-Scaffold-Labs/openscaffold-oauth](https://github.com/Open-Scaffold-Labs/openscaffold-oauth) — shared OAuth 2.0 + OIDC server

### GitHub Pages docs site

https://open-scaffold-labs.github.io/OpenLawFirm/connector/ — public
connector documentation referenced by the eventual Anthropic
Connectors Directory submission.

---

## Still gating the Anthropic Connectors Directory submission

Items that need *you* (none of these can be done by an agent on your
machine — they require your accounts, signing authority, or admin
console access):

1. **Create `security@openscaffoldlabs.com` Workspace Group** — 15 min.
   Referenced in SECURITY.md and the submission form. Currently the
   only step still pending from the original 7-step list you
   sketched. (`support@` already exists per your earlier note.)
2. **Apply to iManage developer registration** — 30 min, **2–4 wk
   lead time**. The longest-lead-time dependency in Sprint 3.
3. **Apply to NetDocuments ndConnect** — 30 min, **2–3 wk lead time**.
4. **Create Box developer account** — 1 hr, free, instant.
5. **Migrate OpenFirehouse** from `draaen-jpg` to `Open-Scaffold-Labs`
   per the GitHub Identity Consolidation white paper — 1 hr.

Items that need *Matt* (or whoever does the production deploy):

1. **Deploy `openscaffold-oauth`** to `auth.openscaffoldlabs.com`
   (HTTPS, persistent JWKS, PostgreSQL adapter for grant storage).
2. **Deploy `openlawfirm-mcp`** to its production subdomain with
   TLS + favicon matching the submitted logo.
3. **Deploy the OpenLawFirm API** to its production subdomain.
4. **Capture 5 promotional screenshots** during a real demo run
   (per `mcp/DEMO-SETUP.md` Scene 1–6).
5. **Submit** via the form per `mcp/SUBMISSION-CHECKLIST.md §5`.

---

## What's still on the deferred list

| # | Item | Effort | Why deferred |
|---|---|---|---|
| 1 | Physical file storage for documents (write actual bytes via DocumentStore adapter) | 1 hr after sandbox credentials are available | Gated on iManage/NetDocuments/Box partner program approvals |
| 2 | Real-time timer start/stop on time entries (the API supports it but the UI doesn't expose it yet) | 30 min | Lower demo priority than CRUD |
| 3 | Three-way IOLTA reconciliation workflow (mark-as-reconciled with auto-detected discrepancies) | 2 hrs | Compliance-critical; needs careful design before implementation |
| 4 | Jurisdiction-aware deadline calculator (statute of limitations rules per practice area + state) | 1 day | Needs jurisdiction data file; Phase 3 of IMPLEMENTATION.md |
| 5 | Setup wizard for new firms onboarding | 1 day | Phase 3 |
| 6 | Practice-area verticals (PI, family, RE, immigration) | Days–weeks each | Phase 4 |

---

## Commits landed this session (most recent first)

```
aade2ab  Refactor list pages to use DataTable from @openscaffold/core
9a93f21  Expense + Contact + Document CRUD UIs, Utilization dashboard, server-suggested matter numbers
59d6ccb  Server: expense CRUD, contact PUT/DELETE, document POST/DELETE, matter numberGenerator, utilization analytics
4860ff4  Polish batch: LEDES cleanup + Matter Edit + Bulk approve
5e15464  Add LEDES 1998B invoice export
b1bb79e  Use shared @openscaffold/core modules: numberGenerator + invoice PDF
2db0321  Wire CRUD across the React app
6fda032  Add Settings → Integrations page (makes architecture visible inside the app)
2387a5b  Sprint 4: realistic seed data, demo run-book, submission status tracker
65bf10b  Fix server schema alignment with shared users table
…
```

(Full log on GitHub. All commits include a `Co-Authored-By: Claude
<noreply@anthropic.com>` trailer.)

---

## When you wake up

1. **Refresh the browser at http://localhost:5192**, sign in as
   `attorney` / `lawfirm1234`, and click through every sidebar item.
   Everything that has a "+ New" button now works.
2. **Try the Utilization page** — it's the visible payoff of the
   compliance-grade time tracking we've been building.
3. **Generate an invoice from any matter with approved unbilled time
   entries**, then download both the PDF (renders with full
   letterhead + line items) and the LEDES file (opens cleanly as
   pipe-delimited text in any editor).
4. If anything is broken or confusing, tell me what you see — I can
   fix it on the spot.

---

## What I did NOT do (chose not to assume)

- **Refactor our local `Modal` component to use core's `Modal`.**
  They're structurally similar but our Modal has a `footer` slot the
  core one doesn't, and refactoring would have changed every form
  modal. Not worth the risk overnight.
- **Skin changes / brand updates.** Stayed on the existing law-600
  Tailwind palette rather than swapping to Electric Indigo
  everywhere. Brand alignment is a deliberate, cross-vertical
  decision you should make consciously, not something I should
  guess at while you're asleep.
- **Database migrations.** No `ALTER TABLE` ran tonight. Every new
  feature uses existing columns. The seed got task_codes backfilled
  but the schema is unchanged.
- **Anything that requires your credentials.** No external accounts
  were created, no domain DNS changes made, no production deploys
  attempted.

Sleep well. Tell me what to fix or push on next when you're up.

— Claude
