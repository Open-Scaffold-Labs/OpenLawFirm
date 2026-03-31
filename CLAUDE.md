# OpenLawFirm — Claude Working Instructions

## Project Identity
- **App**: OpenLawFirm — Law firm practice management (1–50 attorneys)
- **GitHub**: https://github.com/Open-Scaffold-Labs/OpenLawFirm
- **Organization**: Open-Scaffold-Labs
- **Publisher**: Open Scaffold Labs
- **Founder**: Dale Raaen (draaen@mac.com / GitHub: draaen-jpg)

## CRITICAL: Tool Usage

### Git & Mac filesystem → Desktop Commander ONLY
The VM sandbox has an HTTP proxy that blocks HTTPS to github.com.
Bash tool git commands will always fail.

**Always use `mcp__desktop-commander__start_process` for:**
- `git pull`, `git push`, `git log`, `git status`, `git commit`
- Any file read/write on the Mac
- npm/node commands run from the actual project

**Never use the VM Bash tool for git or Mac filesystem operations.**

### Seed Files
Seed files must use `module.exports = async function()` pattern.
Never use standalone scripts with `process.exit()` — they crash the server.

## Open Scaffold Ecosystem

This app is part of the Open Scaffold Labs ecosystem — a family of vertical SaaS applications sharing one PostgreSQL database, one component library, and one launcher.

### Tech Stack (All Apps)
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: Express.js + PostgreSQL (direct queries, no ORM)
- **Auth**: JWT + bcrypt. Shared `users` table.
- **Shared core**: `@openscaffold/core` linked via file: reference

### Code Conventions
- React components: PascalCase (`MatterDetail.jsx`)
- Route files: kebab-case (`time-entries.js`)
- API paths: `/api/kebab-case`
- Database tables: `olf_snake_case`
- CSS: Tailwind utilities only (no custom CSS)
- Token keys: prefixed in localStorage (`olf_token`)

### Document Standards
Always read `openscaffold-core/DOCUMENT-STANDARDS.md` before generating .docx files.
Use Electric Indigo (#4F46E5) title block, Times New Roman 11pt, justified text, navy headings (#1B3A5C).

## This App

### Ports
- **Client**: http://localhost:5192
- **Server**: http://localhost:3024

### Database
- **Table prefix**: `olf_`
- **Shared DB**: `postgresql://[user]@localhost:5432/openfirehouse`
- Token key: `olf_token`

### Demo Credentials
- `attorney` / `lawfirm1234` (partner role)
- `associate` / `lawfirm1234` (associate role)
- `paralegal` / `lawfirm1234` (paralegal role)

### Domain-Specific Concepts
- **Billing increments**: 6-minute (0.1 hour) default, configurable
- **UTBMS codes**: ABA Uniform Task-Based Management System (activity + task codes)
- **LEDES format**: Legal Electronic Data Exchange Standard for invoice export
- **IOLTA**: Interest on Lawyers' Trust Accounts — requires three-way reconciliation
- **Three-way reconciliation**: Bank statement ↔ Trust account ledger ↔ Individual client sub-ledgers must balance
- **Matter**: A legal case or project; central entity linking clients, time, billing, documents

### Structure
```
OpenLawFirm/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── auth.js
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── lib/scaffold.js          (@openscaffold/core client init)
│   │   ├── components/
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── Matters.jsx
│   │       ├── MatterDetail.jsx
│   │       ├── Clients.jsx
│   │       ├── TimeEntry.jsx
│   │       ├── Billing.jsx
│   │       ├── TrustAccounting.jsx
│   │       ├── Calendar.jsx
│   │       └── Settings.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── index.js                  (Express app, auth, dashboard, mounts)
│   │   ├── db.js                     (PostgreSQL schema + seed data)
│   │   ├── scaffold.js               (@openscaffold/core server utils)
│   │   ├── integrations.js           (@openscaffold/integrations adapters)
│   │   └── routes/
│   │       ├── clients.js
│   │       ├── matters.js
│   │       ├── time-entries.js
│   │       ├── invoices.js
│   │       ├── trust.js              (IOLTA + three-way reconciliation)
│   │       ├── calendar.js
│   │       └── settings.js
│   └── package.json
└── CLAUDE.md
```

### Database Tables (olf_ prefix)
| Table | Purpose |
|-------|---------|
| `olf_clients` | Individual and company clients |
| `olf_practice_areas` | Practice area taxonomy |
| `olf_matters` | Legal matters (cases/projects) |
| `olf_time_entries` | 6-min increment time tracking |
| `olf_expenses` | Billable/non-billable expenses |
| `olf_activity_codes` | UTBMS activity codes |
| `olf_task_codes` | UTBMS task codes |
| `olf_invoices` | Invoice headers |
| `olf_invoice_line_items` | Fee + expense line items |
| `olf_trust_accounts` | IOLTA bank accounts |
| `olf_trust_transactions` | Trust deposits/disbursements |
| `olf_client_trust_ledger` | Per-client trust sub-balances |
| `olf_documents` | Matter document metadata |
| `olf_calendar_events` | Deadlines, hearings, meetings |
| `olf_contacts` | Opposing counsel, witnesses, etc. |
| `olf_billing_rates` | Per-user hourly rates |
| `olf_matter_rates` | Matter-specific rate overrides |
| `olf_payments` | Payment receipts |
| `olf_audit_log` | Full audit trail |
| `olf_notifications` | User notifications |
| `olf_settings` | Firm configuration |

### API Routes
```
POST   /api/auth/login
GET    /api/auth/me
GET    /api/dashboard
GET    /api/notifications
PUT    /api/notifications/:id/read
GET    /api/staff
GET    /api/practice-areas
GET    /api/activity-codes
GET    /api/task-codes

# Clients
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PUT    /api/clients/:id
GET    /api/clients/:id/matters

# Matters
GET    /api/matters
GET    /api/matters/:id
POST   /api/matters
PUT    /api/matters/:id
GET    /api/matters/:id/time-entries
GET    /api/matters/:id/expenses
GET    /api/matters/:id/contacts
POST   /api/matters/:id/contacts
GET    /api/matters/:id/documents

# Time Entries
GET    /api/time-entries
POST   /api/time-entries
PUT    /api/time-entries/:id
DELETE /api/time-entries/:id
POST   /api/time-entries/approve
POST   /api/time-entries/timer/start
POST   /api/time-entries/timer/stop/:id
GET    /api/time-entries/summary/today

# Invoices
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices/generate
PUT    /api/invoices/:id/status
POST   /api/invoices/:id/payments

# Trust / IOLTA
GET    /api/trust/accounts
GET    /api/trust/transactions
POST   /api/trust/deposit
POST   /api/trust/disbursement
GET    /api/trust/client-ledger
GET    /api/trust/reconciliation

# Calendar
GET    /api/calendar
POST   /api/calendar
PUT    /api/calendar/:id
DELETE /api/calendar/:id

# Settings
GET    /api/settings
PUT    /api/settings/:key
```
