---
title: OpenLawFirm Connector Tool Reference
---

# Tool Reference

The OpenLawFirm connector exposes seven tools. Six are read-only; one (`time_entry_create`) creates new state. All seven respect the user's OpenLawFirm matter-level access controls.

## `matter_search`

**Annotation:** `readOnlyHint: true`

Search matters in your firm's OpenLawFirm instance by client, attorney, status, practice area, or open-text query against matter name and description. Returns up to 20 matches.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Open-text search against matter name and description |
| `client_name` | string | No | Filter by client name (partial match) |
| `attorney_id` | string | No | Filter by responsible attorney ID |
| `status` | enum | No | One of `open`, `pending`, `closed`, `on_hold` |
| `practice_area` | string | No | Practice area slug (e.g., `personal_injury`) |
| `limit` | int (1–50) | No | Max results. Default 20. |

### Output

JSON array of matter summaries. Each entry includes:

- `id` — matter ID
- `name` — matter name
- `client` — client name and ID
- `responsible_attorney` — attorney name and ID
- `status` — current status
- `open_date` — date matter was opened
- `practice_area` — practice area

### Example invocation

> *Show me my open personal injury matters from this year.*

Claude calls `matter_search({ status: "open", practice_area: "personal_injury" })` and returns the list.

---

## `matter_get`

**Annotation:** `readOnlyHint: true`

Retrieve full detail for a single matter by ID, including parties, key dates, billing summary, trust balance, recent time entries, and attached documents.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `matter_id` | string | Yes | The matter ID |

### Output

Full matter object: metadata, client and parties, key dates (open date, statute of limitations, trial date if applicable), billing summary (WIP value, last invoice, outstanding balance), trust balance, last 10 time entries, and a list of attached documents with metadata.

### Example invocation

> *Tell me everything about the Sandoval matter.*

Claude calls `matter_search` first to find the matter ID, then `matter_get` with that ID.

---

## `time_entry_create`

**Annotation:** `readOnlyHint: false` (creates new state)

Create a billable or non-billable time entry on a matter. Hours must be in 0.1-hour (six-minute) increments per industry convention. LEDES activity codes are strongly recommended — entries without them require manual coding before LEDES 1998B export.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `matter_id` | string | Yes | The matter ID |
| `hours` | number | Yes | Hours in 0.1 increments (e.g., `0.2` = 12 minutes) |
| `narrative` | string | Yes | Description of work performed |
| `activity_code` | string | No | LEDES activity code (e.g., `L110`, `L120`) — strongly recommended |
| `task_code` | string | No | UTBMS task code |
| `billable` | boolean | No | Default `true` |
| `date` | string (YYYY-MM-DD) | No | Entry date. Default: today. |

### Output

Confirmation with the new time entry ID, matter, hours, code, and narrative.

### Example invocation

> *Log 0.2 to the Sandoval matter, telephone conference re settlement posture.*

Claude calls `time_entry_create({ matter_id: "olf-matter-1234", hours: 0.2, narrative: "Telephone conference re settlement posture", activity_code: "L120" })`.

---

## `document_search`

**Annotation:** `readOnlyHint: true`

Search documents within a matter scope or across all matters the user has access to. Returns document metadata and a retrieval URL.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `matter_id` | string | No | Scope to a single matter (recommended) |
| `query` | string | No | Open-text search against filename and document content |
| `document_type` | string | No | Filter by type (`pleading`, `contract`, `correspondence`, `medical_record`, etc.) |
| `date_from` | string | No | YYYY-MM-DD, inclusive |
| `date_to` | string | No | YYYY-MM-DD, inclusive |
| `limit` | int (1–50) | No | Max results. Default 20. |

### Output

JSON array of document metadata. Each entry includes:

- `id` — document ID
- `filename` — original filename
- `matter_id` — owning matter
- `type` — document type
- `upload_date` — when uploaded
- `url` — retrieval URL (requires OpenLawFirm session to download)

### Example invocation

> *Find the medical records on the Sandoval matter.*

Claude calls `document_search({ matter_id: "olf-matter-1234", document_type: "medical_record" })`.

---

## `invoice_status`

**Annotation:** `readOnlyHint: true`

Query invoice status, outstanding balance, due date, and last payment date. Useful for collections triage and managing-partner dashboards.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `matter_id` | string | No | Filter to invoices for a single matter |
| `client_id` | string | No | Filter to invoices for a single client |
| `status` | enum | No | `draft`, `sent`, `partial`, `paid`, `overdue`, `void` |
| `days_overdue` | int | No | Filter to invoices overdue by at least N days |
| `limit` | int (1–50) | No | Max results. Default 20. |

### Output

JSON array of invoice summaries: ID, amount, status, outstanding balance, due date, last payment date, and link to the invoice in the OpenLawFirm UI.

### Example invocation

> *Which invoices are over 60 days past due?*

Claude calls `invoice_status({ status: "overdue", days_overdue: 60 })`.

---

## `trust_balance`

**Annotation:** `readOnlyHint: true`

Query IOLTA trust account balance for a client or matter. Returns current balance, last deposit, last disbursement, last three-way reconciliation date, and any out-of-balance alerts.

**Read-only by design.** Trust account modifications (deposits, disbursements) must go through the OpenLawFirm UI to preserve the audit trail required by bar regulations.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | One of these | Query balance for a specific client |
| `matter_id` | string | One of these | Query balance for a specific matter |

At least one of `client_id` or `matter_id` must be provided.

### Output

- `balance` — current trust balance for the client or matter
- `last_deposit` — { amount, date, source }
- `last_disbursement` — { amount, date, payee }
- `last_reconciliation_date` — last three-way reconciliation timestamp
- `out_of_balance` — boolean, true if the trust account is currently flagged as out of three-way balance

### Example invocation

> *What's the trust balance on the Sandoval matter?*

Claude calls `trust_balance({ matter_id: "olf-matter-1234" })`.

---

## `calendar_query`

**Annotation:** `readOnlyHint: true`

Query upcoming court dates, hearings, filing deadlines, statutes of limitations, and matter milestones.

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `matter_id` | string | No | Scope to a single matter |
| `attorney_id` | string | No | Scope to a single attorney's calendar |
| `event_type` | enum | No | `hearing`, `filing_deadline`, `statute_of_limitations`, `meeting`, `milestone`, `other` |
| `days_ahead` | int (1–365) | No | Lookahead window. Default 14. |
| `include_past` | boolean | No | Default `false` |

### Output

JSON array of calendar events: ID, type, date, matter, attorney, description, jurisdiction (where applicable), and link to the event detail in OpenLawFirm.

### Example invocation

> *Show me my deadlines this week.*

Claude calls `calendar_query({ attorney_id: "<your id>", days_ahead: 7 })`.

---

## Combining tools

Claude can chain these tools naturally:

> *Pull up everything I need to prep for the Sandoval hearing on Friday.*

Claude:

1. `calendar_query({ event_type: "hearing", days_ahead: 7 })` to find the hearing
2. `matter_get({ matter_id: <Sandoval's ID> })` to load the matter
3. `document_search({ matter_id: <Sandoval's ID>, document_type: "pleading" })` to find recent filings
4. Pairs with the **Litigation Legal** plugin if installed to assemble the prep brief

The connector provides the data; the plugin (or Claude itself, if no plugin is installed) provides the cognition.

## Error handling

Every tool returns clear, actionable errors:

| Error | Meaning | Resolution |
|---|---|---|
| `unauthorized` | Missing or invalid OAuth token | Re-authenticate via the connector settings |
| `forbidden` | Token valid but lacks required scope | Re-grant scopes |
| `not_found` | Matter, client, document, or invoice ID does not exist | Check the ID |
| `access_denied` | User does not have access to this resource | Contact your firm's OpenLawFirm administrator |
| `validation_error` | Input failed schema validation | Check the input shape (Claude usually fixes this automatically on retry) |
| `internal_error` | Unexpected server error | Try again; if persistent, contact support |
