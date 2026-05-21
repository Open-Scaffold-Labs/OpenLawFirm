# OpenLawFirm + Claude — Demo Run-Book

**Audience:** Dale, Matt, or any future demo presenter
**Companion doc:** [`DEMO-SCRIPT.md`](./DEMO-SCRIPT.md) (narrative + screenshot plan)
**Time to set up cold:** ~10 minutes
**Time to walk through the demo:** ~5 minutes

This is the *executable* version of `DEMO-SCRIPT.md` — every command to run, every prompt to paste, every expected response. If you're presenting to a design partner, follow this top to bottom.

---

## Pre-flight (do once, the morning of the demo)

### 1. Start PostgreSQL

```bash
# Should already be running. Verify:
psql -h localhost -U $USER -d openfirehouse -c "SELECT 1" >/dev/null && echo OK
```

### 2. Reset the demo data

This produces 10 matters across PI / family / employment / real estate / criminal / estate planning, 59 time entries spread over 30 days, 18 upcoming calendar events, IOLTA balances on every matter, 12 documents, and 5 invoices in various states.

```bash
cd ~/Projects/OpenLawFirm/server
node --env-file=.env seed-realistic.js
```

Expected output ends with:

```
Realistic seed complete:
{
  clients: '10',
  matters: '10',
  time_entries: '59',
  total_hours: '102.9',
  events: '18',
  documents: '12',
  trust_txns: '14',
  trust_balance: '92200.00',
  invoices: '5',
  ar_balance: '27400.00'
}
```

### 3. Start the three services

In three separate terminals (or via `tmux` / `iTerm` panes):

```bash
# Terminal 1 — OpenLawFirm API on :3024
cd ~/Projects/OpenLawFirm/server
node --env-file=.env src/index.js

# Terminal 2 — openscaffold-oauth on :4000
cd ~/Projects/openscaffold-oauth
node --env-file=.env src/index.js

# Terminal 3 — openlawfirm-mcp on :3825
cd ~/Projects/OpenLawFirm/mcp
node --env-file=.env src/index.js
```

Verify all three respond:

```bash
curl -s http://localhost:3024/health
curl -s http://localhost:4000/health
curl -s http://localhost:3825/health
```

### 4. Quick smoke test against real data

```bash
cd ~/Projects/OpenLawFirm/mcp
node --env-file=.env test-tools.js
```

Every tool should return non-empty data. If `calendar_query` says `Found 18 event(s)` and `trust_balance` shows roughly $92K, you're ready.

---

## Demo flow (~5 minutes, 6 scenes)

The demo is **Maria Chen, senior associate at a 10-attorney PI firm**, walking through a typical morning. Each scene below has:

- The narrator beat (what to say while typing)
- The exact prompt to paste into Claude
- The expected behavior (what Claude does behind the scenes)
- What to point out

For all scenes: have Claude Cowork open with the OpenLawFirm connector installed and authorized.

> **Note on connector installation:** Until the connector is submitted and approved, you install it manually in Claude Cowork settings → Connectors → Add custom → URL `http://localhost:3825/mcp` (or production URL once deployed). OAuth flow walks you through the consent screen at `http://localhost:4000/interaction/...`.

---

### Scene 1 — Morning deadline check (~45 sec)

**Narrator:** "Maria opens her laptop at 8 AM. Instead of opening her practice management software, then her calendar, then her email — she just opens Claude."

**Prompt:**
```
Show me my deadlines and hearings for the next two weeks. Group them by matter so I know what to prioritize.
```

**What happens:** Claude calls `calendar_query({ days_ahead: 14 })`. The MCP server returns 14+ events from the seeded calendar — including the Hartman statute of limitations expiring in 9 days, Garcia mediation, Reyes DMV hearing, Patel discovery responses due.

**Point out:** Hartman v. Bayview Medical has both "statute of limitations expires" and "file complaint deadline" within the next 9 days. Real practice-management software *should* flag exactly this kind of high-stakes deadline cluster — and now Claude can surface it without Maria opening another app.

**[SCREENSHOT 1]** — Capture this list.

---

### Scene 2 — Time entry from a client call (~30 sec)

**Narrator:** "Maria takes a 12-minute phone call with Maria Sandoval — settlement discussion. The instant she hangs up:"

**Prompt:**
```
Log 0.2 hours to the Sandoval matter, telephone conference re settlement posture. Activity code L120.
```

**What happens:** Claude calls `matter_search({ query: "Sandoval" })` to find the matter ID, then `time_entry_create({ matter_id: "1", hours: 0.2, narrative: "Telephone conference re settlement posture", activity_code: "L120" })`. The MCP server posts to `/api/time-entries`, which rounds to the 0.1 increment, looks up Maria's billing rate from `olf_billing_rates`, and inserts the row with status `draft`.

**Point out:** The time entry is in the database before Maria can pour her next cup of coffee. No spreadsheet. No mental math from "12 minutes" to "0.2 hours." No app switching. LEDES-coded, ready for invoice generation.

**[SCREENSHOT 2]** — Capture the confirmation.

---

### Scene 3 — Demand letter drafting in Word (~90 sec)

**Narrator:** "Maria switches to Word to draft a demand letter for the Sandoval matter."

**Prompt (in Claude for Word sidebar):**
```
Draft a settlement demand letter for the Sandoval v. Acme Foods slip-and-fall matter. Pull the relevant medical records from the matter file. Reference any comparable settlements we have. Use our firm's standard PI demand format.
```

**What happens:** Claude executes in sequence:

1. `matter_get({ matter_id: "1" })` — pulls full matter context including opposing counsel (Bell & Associates), opposing party (Acme Foods Inc.), and the matter notes ("High-value PI matter; client has substantial medical specials")
2. `document_search({ matter_id: "1", document_type: "medical_record" })` — finds `Sandoval_Medical_Records_Combined.pdf`
3. `document_search({ matter_id: "1", document_type: "evidence" })` — finds `Sandoval_Incident_Photos.zip`
4. Uses the **Litigation Legal plugin** (if installed) to apply the firm's demand letter format

**Point out:** Claude draws on three sources at once — the matter graph, the document store, and Anthropic's litigation plugin. The integration is invisible to Maria. She didn't tell Claude *where* the medical records were; the connector exposes them as part of the matter's first-class data.

**[SCREENSHOT 3]** — Word with the draft + the Claude sidebar showing tool calls.

---

### Scene 4 — Signature routing (~30 sec)

**Narrator:** "Maria edits the draft, accepts it, and routes for the partner's signature."

**Prompt:**
```
Send this to Katherine for signature via DocuSign. Use the standard PI envelope template.
```

**What happens:** Claude uses the **DocuSign connector** (from Anthropic's directory) to create an envelope. Future state: when you have OpenLawFirm's DocuSeal adapter wired up (`@openscaffold/integrations/document-store`), Claude can route via DocuSeal as well. For the demo, DocuSign is sufficient.

**Point out:** OpenLawFirm doesn't build a signature service of its own. We provide matter context; Anthropic provides DocuSign connectivity. The two compose without us having to write any DocuSign code.

**[SCREENSHOT 4]** — Capture the envelope confirmation.

---

### Scene 5 — New client intake with conflict check (~45 sec)

**Narrator:** "10:30 AM. The intake coordinator buzzes Maria — a potential new client just walked in. Slip and fall at a Walmart store."

**Prompt:**
```
Check for conflicts on opening a new matter for "Sarah Whitfield" — slip and fall, opposing party "Walmart store #4521". Both at the named-party level and any prior matters involving Walmart.
```

**What happens:** Claude calls `matter_search` twice — once with `query: "Whitfield"` (returns nothing), once with `query: "Walmart"` (returns nothing because our seed doesn't have prior Walmart matters). Claude then narrates: "No active conflicts. No prior matters with Walmart as opposing party. Safe to proceed with intake."

**Point out:** In a real firm, this query would search the entire matter history — current + closed + the contacts table for related parties. The whole graph is in one PostgreSQL schema, so the query is just a few SELECT statements joined together. In a Clio shop, this would be multiple API calls across separate systems.

**[SCREENSHOT 5]** — Capture the conflict-check result.

---

### Scene 6 — End-of-day managing partner dashboard (~60 sec)

**Narrator:** "6:00 PM. Tom, the managing partner, opens Claude for his end-of-day check-in."

**Prompt (as Tom — switch user identity if presenting):**
```
Give me today's firm summary. I want to see hours billed today, attorneys under their utilization target, overdue invoices, and the trust account reconciliation status.
```

**What happens:** Claude orchestrates multiple tools:

1. `matter_search({ status: "open" })` — list of active matters
2. Multiple `matter_get` calls to aggregate today's billable hours by attorney
3. `invoice_status({ status: "overdue", days_overdue: 0 })` — collections aging (returns the Garcia matter at 60+ days, $3,800)
4. `trust_balance({})` — aggregate trust balance and reconciliation timestamp ($92,200 across 10 matters)

**Point out:** Same connector. Same data layer. Completely different audience. The associate uses it to log time without leaving Word; the managing partner uses it to run the firm. One system of record.

**[SCREENSHOT 6]** — Capture the dashboard summary.

---

## Troubleshooting

### "MCP tool returned 401 Unauthorized"

Either the OAuth token expired (re-authenticate in Claude settings) or the OpenLawFirm session JWT mint failed. Check:

```bash
tail -50 /tmp/mcp.log
```

Common cause: `OLF_JWT_SECRET` in `mcp/.env` doesn't match `JWT_SECRET` in `server/.env`. They must be identical.

### "MCP tool returned 'OpenLawFirm API ... 500: ...'"

The OpenLawFirm API hit an error. Check:

```bash
tail -50 /tmp/olf-server.log
```

Common cause: missing column or table — but the seed-realistic script catches most of these. If you see one, file a fix.

### "Claude says it can't reach the connector"

The MCP server isn't running, or Claude's connector config has the wrong URL. Verify the connector config in Claude settings points to `http://localhost:3825/mcp` (local) or your production URL.

### "OAuth consent screen shows but then errors"

Stale interaction session. Delete cookies in the browser for `localhost:4000` and retry.

### "Calendar shows 0 events"

The seed dates are relative to `today` at run time. If you seeded yesterday and the seeded events have past timestamps, re-run `seed-realistic.js`.

### "Sandoval matter doesn't exist"

Check matter IDs after the latest seed — IDs reset to 1 every time `seed-realistic.js` runs. Run `matter_search` first; use the returned IDs in subsequent prompts. The script always seeds the **Sandoval matter as the first matter** (`PI-2026-001`).

---

## Variations

### For a different practice area

The seed includes matters across PI, family law, employment, criminal, real estate, and estate planning. Substitute in the demo:

- **Family law audience:** swap Sandoval (PI) for Garcia (FAM-2026-001) — dissolution with contested custody, mediation, asset disclosure deadline
- **Employment audience:** O'Brien v. TechCo wrongful termination, class certification motion hearing
- **Estate planning audience:** Iyer Estate Plan, revocable trust execution coming up

Edit the prompts in scenes 2–6 to reference the right matter.

### For a different firm size

Talk track adjustment: for a **solo practitioner**, emphasize that the same MCP server runs at any scale; the demo as written assumes 4 staff, but the database supports any number. For a **20+ attorney mid-market firm**, emphasize the iManage and NetDocuments adapters (currently in skeleton state per `docs/partner-programs.md`).

### Skip the OAuth dance

For demos where you don't want to walk through consent, pre-authorize the connector in Claude before the demo session and refresh the token. Once authorized, subsequent tool calls just work.

---

## After the demo

When you finish:

1. Note any questions or feedback in your notes
2. If the prospect is interested, walk them through `IMPLEMENTATION.md` and the design-partner program in the positioning one-pager
3. Restart fresh seed data before the next demo: `node --env-file=.env seed-realistic.js`

---

## Recording the screencast version (Sprint 4 deliverable)

If you're recording the 5-minute video for design-partner outreach:

- Use Loom, ScreenStudio, or QuickTime
- Browser zoom **110%**, no extensions visible
- macOS dark mode off (lighter screens read better on YouTube)
- Hide the dock; full-screen the browser
- Have only Claude Cowork + Word + one terminal open
- Record at 1920×1080 minimum
- After recording, trim dead air between scenes — 5 min total target
- Export as MP4, upload to YouTube as unlisted, share the link with design partners

Reference `DEMO-SCRIPT.md` for the voiceover script.
