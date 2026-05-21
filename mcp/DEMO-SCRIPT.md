# OpenLawFirm Connector — Demo Script & Screenshot Plan

**Target length:** 5 minutes
**Audience:** design partner firms, Anthropic Connectors Directory reviewer, future YouTube launch
**Demo persona:** Maria Chen, senior associate at a 10-attorney personal injury firm
**Demo firm:** "Hartwell & Cole LLP" (fictional)

This script is used three ways:

1. **Promotional screenshots** for the Connectors Directory submission — capture the boxed moments below
2. **5-min demo video** for design partner outreach once Sprint 4 ships
3. **Internal acceptance criteria** — every flow below must work end-to-end before we submit

---

## Setup before recording

- Demo OpenLawFirm instance running at `demo.openlawfirm.openscaffoldlabs.com`
- Seed data: 8 matters across personal injury, employment, and family law; 50+ time entries spread across 4 attorneys; IOLTA balances on 5 matters; 3-5 documents per matter; 12 calendared deadlines in the next 30 days
- Maria's user account: senior associate role, access to all 8 matters
- Claude Cowork session signed in as Maria
- OpenLawFirm connector installed and authorized in Maria's Claude account
- Litigation Legal plugin installed (we're showing a PI workflow)
- Microsoft Word open with a blank doc (for the drafting scene)

Browser zoom: 110% — text large enough to read in a screencast but doesn't break layout.

---

## Scene 1 — Morning deadline check (0:00–0:45)

**[SCREENSHOT 1]** — *Hero shot: Claude Cowork showing a deadline list with matter links*

Maria opens Claude Cowork at 8:00 AM. Types:

> *Show me my deadlines for this week.*

Claude calls `calendar_query({ attorney_id: "maria-chen", days_ahead: 7 })`. Returns 4 events:

- Mon 5/25 — Sandoval v. Acme — Motion for Summary Judgment due
- Wed 5/27 — Patel discovery responses due
- Thu 5/28 — Garcia mediation
- Fri 5/29 — Hartman statute of limitations (last day to file)

Maria: *"Pull up the Sandoval matter."*

Claude calls `matter_search({ query: "Sandoval" })` then `matter_get({ matter_id: "..." })`. Shows full matter card: client Maria Sandoval, opposing counsel, key dates, recent activity, trust balance ($5,250 remaining), 12 attached documents.

**Why this scene matters:** establishes that Claude knows the firm's matters and deadlines without Maria opening OpenLawFirm directly.

---

## Scene 2 — Time entry from a client call (0:45–1:30)

**[SCREENSHOT 2]** — *Mid-conversation: voice-driven time entry creation*

Maria's phone rings — Mr. Sandoval calling. She takes the call (12 minutes). When she hangs up, she switches back to Claude and says:

> *Log 0.2 to Sandoval, telephone conference re settlement posture. Activity code L120.*

Claude calls `time_entry_create({ matter_id: "olf-matter-sandoval", hours: 0.2, narrative: "Telephone conference re settlement posture", activity_code: "L120" })`.

Claude confirms: "Time entry created on Sandoval v. Acme: 0.2 hours, L120 Analysis/Strategy, telephone conference re settlement posture."

**Why this scene matters:** this is the killer feature. The friction-free time entry is exactly what the *Fractured Law Firm* white paper identified as the root cause of underbilling. Solved in one chat turn.

---

## Scene 3 — Drafting a demand letter (1:30–3:00)

**[SCREENSHOT 3]** — *Microsoft Word with Claude sidebar showing the drafted demand letter*

Maria switches to Word and starts a new document. Opens the Claude sidebar.

> *Draft a settlement demand letter for the Sandoval matter. Use our standard PI demand template. Include the relevant medical records and the comparable settlement amounts.*

Claude:

1. Calls `matter_get({ matter_id: "olf-matter-sandoval" })` to load the matter context
2. Calls `document_search({ matter_id: "olf-matter-sandoval", document_type: "medical_record" })` to find the medical records
3. Calls `document_search({ document_type: "settlement_agreement", query: "similar injury PI" })` to find comparable settlements
4. Uses the **Litigation Legal plugin** to apply the firm's house demand letter format
5. Drafts the letter directly in Word, citing the medical records and comparable settlements

Maria reads the draft, makes a few edits, and accepts.

**Why this scene matters:** shows Claude orchestrating *both* the OpenLawFirm connector (matter + document data) *and* the Anthropic Litigation Legal plugin (drafting framework) in one workflow. This is the architectural pitch made tangible.

---

## Scene 4 — Routing for signature (3:00–3:30)

**[SCREENSHOT 4]** — *DocuSign envelope routing confirmation from inside Claude*

> *Send the demand letter to opposing counsel via DocuSign. Use the standard PI envelope template.*

Claude uses the **DocuSign connector** (from Anthropic's directory) to:

1. Create a DocuSign envelope from the drafted letter
2. Pre-fill the recipient (opposing counsel — pulled from `matter_get`'s response)
3. Apply the standard signature block
4. Send and return the envelope ID

Confirmation in Claude: "Envelope sent to opposing counsel. DocuSign envelope ID: ABC-123. Tracked in Sandoval matter."

**Why this scene matters:** shows OpenLawFirm + Anthropic's existing connectors working together. We don't have to build DocuSign integration — Anthropic shipped it. Our job is to be the matter context.

---

## Scene 5 — New client intake with conflict check (3:30–4:15)

**[SCREENSHOT 5]** — *Conflict-check result + new matter creation flow*

Mid-morning, the firm administrator calls Maria. A new potential client just walked in.

Maria: *"Open a new intake for Sarah Whitfield, slip-and-fall, opposing party is Walmart store #4521. Check for conflicts.*"

Claude:

1. Calls `matter_search({ query: "Whitfield Sarah" })` — no conflicts on the named party
2. Calls `matter_search({ query: "Walmart" })` — finds 2 prior matters where Walmart was the opposing party, both closed
3. Confirms: "No active conflicts. 2 prior matters with Walmart as opposing party (both closed). Proceed with intake?"

Maria confirms. New matter opened. Retainer request triggered through OpenLawFirm's client portal. (The actual new-matter creation is handled by an OpenLawFirm web flow — we're not exposing that via MCP in v0.1 to keep the surface tight.)

**Why this scene matters:** shows the conflict-check workflow that bar regulations effectively require. And shows that the connector is read-only for the things that should be read-only (matter creation), and write-enabled for the things that should be (time entry).

---

## Scene 6 — End-of-day partner dashboard (4:15–5:00)

**[SCREENSHOT 6]** — *Managing partner dashboard view, summary stats*

At 6:00 PM, Tom (the managing partner) opens Claude. Types:

> *Give me today's firm summary.*

Claude calls multiple tools in sequence:

- `matter_search({ status: "open" })` — list of active matters
- Aggregation across `matter_get` calls (or a single roll-up endpoint Matt may add) — today's billable hours by attorney
- `invoice_status({ status: "overdue", days_overdue: 60 })` — collections aging
- `calendar_query({ days_ahead: 7 })` — week-ahead deadlines firm-wide
- Trust reconciliation status from `trust_balance` aggregated

Returns a formatted summary:

- Today's billable hours: 87.2 across 9 attorneys
- Top 3 matters by hours: Sandoval (4.5), Patel (3.8), Garcia (3.2)
- Attorneys under utilization target today: Davis (1.2 hrs), Wong (0.8 hrs)
- 3 invoices over 60 days past due, totaling $14,250
- 7 deadlines in next 7 days
- Trust accounts: all 5 reconciled within last 24 hours, $52,100 total balance

**Why this scene matters:** closes the loop — the same connector that helped an associate log time helps a managing partner run the firm. One dashboard. One data source. One interface.

---

## Voiceover script (for the recorded demo)

If we're producing a 5-min screencast with narration:

> **0:00** Meet Maria Chen, a senior associate at a 10-attorney personal injury firm. Her firm runs on OpenLawFirm — our open-source practice management platform — and she has a paid Claude subscription.
>
> **0:10** This morning, instead of opening OpenLawFirm, then her calendar, then her time tracker, then Word — Maria just opens Claude.
>
> **0:20** [Scene 1 starts] *"Show me my deadlines for this week."* Claude already knows. It's calling OpenLawFirm directly through the MCP connector we publish to Anthropic's Connectors Directory. The same access controls Maria has when she's signed in to OpenLawFirm apply here — she only sees her own matters.
>
> **0:45** [Scene 2] Twelve minutes on the phone with a client. Watch this. *"Log 0.2 to Sandoval, telephone conference re settlement posture, activity code L120."* That's it. Six-minute increment. LEDES coded. Attached to the right matter. Done before she hangs up the phone.
>
> **1:30** [Scene 3] Now the demand letter. Notice she's in Microsoft Word. Claude is reading the matter context — the client, the injury, the medical records — through the OpenLawFirm connector, and using Anthropic's Litigation Legal plugin to apply the firm's drafting standards. The first draft writes itself.
>
> **3:00** [Scene 4] Signature routing through DocuSign — also from Anthropic's connector ecosystem. We don't build that integration. We provide the matter context that makes Claude's DocuSign workflow actually useful.
>
> **3:30** [Scene 5] New client intake with conflict checking. The connector queries every matter the firm has ever opened — current and historical — and surfaces conflicts in seconds.
>
> **4:15** [Scene 6] End of day. The managing partner gets the same connector working for him in a different shape — utilization, collections aging, trust reconciliation status, week-ahead deadlines. One interface. One data source. Across every role in the firm.
>
> **5:00** This is what happens when practice management is the system of record and Claude is the universal interface. Both are open. Both compose with the rest of the Claude for Legal ecosystem. Both run today.
>
> [Closing card with openscaffoldlabs.com and the GitHub repo URL]

---

## Screenshot capture checklist

For the Connectors Directory submission, we need at minimum 3 promotional screenshots. Recommended 5 from the scenes above:

- [ ] **Screenshot 1** — Hero: Claude Cowork showing deadline list (Scene 1)
- [ ] **Screenshot 2** — Voice-driven time entry creation (Scene 2)
- [ ] **Screenshot 3** — Word + Claude sidebar drafting the demand letter (Scene 3)
- [ ] **Screenshot 4** — Conflict-check result (Scene 5)
- [ ] **Screenshot 5** — Managing partner dashboard (Scene 6)

Format: PNG, 1920×1200 or higher, no personal information visible (use the fictional firm + seed data only).

Capture from a clean browser profile with no extensions visible, default Claude theme (light mode), default Word theme. Crop tightly — Anthropic's directory presentation does the framing; we just want the content.

---

## Internal acceptance criteria

Before we submit, every scene above must:

- [ ] Execute end-to-end against the demo OpenLawFirm instance
- [ ] Take no more than 5 minutes total
- [ ] Show actual API responses, not mocked content
- [ ] Have no failed tool calls or error states visible
- [ ] Use only the 7 tools defined in v0.1 plus connectors from Anthropic's existing directory (DocuSign for Scene 4)

If any scene can't be executed cleanly, fix the underlying issue *before* submitting. A reviewer will test the connector against the docs we ship — if the demo says we can do X and we can't, that's a rejection.
