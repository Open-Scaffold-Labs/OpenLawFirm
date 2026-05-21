# openlawfirm-mcp — Anthropic Connectors Directory Submission Checklist

**Target submission date:** End of Sprint 2 (~4 weeks from 2026-05-19)
**Submission URL:** https://claude.com/docs/connectors/building/submission
**Decision-maker on submit:** Dale Raaen
**Engineering owner:** Matt Lavin

Anthropic manually reviews every Connectors Directory submission. Per [community reports](https://support.claude.com/en/articles/11596036-anthropic-connectors-directory-faq), review typically takes 2–4 weeks. About 30% of submissions are rejected on first pass — usually for missing annotations. This checklist exists to make sure we're not in that 30%.

Sections in submit order: (1) Engineering must be done, (2) Documentation must exist, (3) Brand assets ready, (4) Policy items confirmed, (5) Submission form filled.

---

## 1. Engineering completeness

These are gated on Matt's Sprint 1 and Sprint 2 work. Don't submit until all are green.

### Auth
- [ ] `openscaffold-oauth` service deployed at `auth.openscaffoldlabs.com`
- [ ] OAuth 2.0 Authorization Code flow working
- [ ] PKCE enforced (no plain OAuth code flow accepted)
- [ ] JWKS endpoint live at `https://auth.openscaffoldlabs.com/.well-known/jwks.json`
- [ ] Discovery metadata live at `https://auth.openscaffoldlabs.com/.well-known/oauth-authorization-server`
- [ ] Refresh token rotation working
- [ ] Token revocation endpoint working
- [ ] `openlawfirm-mcp` registered as an OAuth client with `client_id: openlawfirm-mcp-claude-connector`

### MCP server
- [ ] Production deployment at `mcp.openlawfirm.openscaffoldlabs.com` (HTTPS only)
- [ ] TLS certificate valid (Let's Encrypt or commercial cert)
- [ ] Origin-header validation enforced (rejects requests from non-Claude origins)
- [ ] CORS configured to allow only `https://claude.ai` and `https://claude.com`
- [ ] Discovery endpoint live at `https://mcp.openlawfirm.openscaffoldlabs.com/.well-known/mcp-server`
- [ ] Healthcheck endpoint live at `/health` returning `{"status":"ok"}`

### Tools
- [ ] All 7 tools wired to live OpenLawFirm API:
  - [ ] `matter_search`
  - [ ] `matter_get`
  - [ ] `time_entry_create`
  - [ ] `document_search`
  - [ ] `invoice_status`
  - [ ] `trust_balance`
  - [ ] `calendar_query`
- [ ] Every tool has `readOnlyHint` or `destructiveHint` annotation (in current scaffold — verify after Matt's wiring)
- [ ] Every tool has clear `description` and complete `inputSchema`
- [ ] Every tool returns structured content with at least one `type: "text"` block
- [ ] Error responses are human-readable (e.g., "Missing required scope" not "403")

### Access control
- [ ] Connector enforces user's matter-level access (test: user A cannot see user B's matters via MCP)
- [ ] `time_entry_create` validates the user is authorized to bill on the requested matter
- [ ] Privileged matters and documents are filtered out by default

### Audit
- [ ] Every tool invocation logs to OpenLawFirm's `olf_audit_log`
- [ ] Connector's own audit log captures tool name, user ID, timestamp, and field-level input metadata
- [ ] No matter content, client PII, or document contents are logged

---

## 2. Documentation

### Public docs (Anthropic's URL requirement)
- [ ] GitHub Pages enabled on the repo (Settings → Pages → "Deploy from a branch", `main` branch, `/docs` folder)
- [ ] `https://open-scaffold-labs.github.io/OpenLawFirm/` resolves
- [ ] `https://open-scaffold-labs.github.io/OpenLawFirm/connector/` renders the connector index
- [ ] `/connector/install.md` accessible
- [ ] `/connector/tools.md` accessible
- [ ] `/connector/privacy.md` accessible

### Internal docs (already in the repo)
- [x] `IMPLEMENTATION.md` — strategic plan
- [x] `INTEGRATIONS.md` — connector integration matrix
- [x] `docs/oauth-design.md` — OAuth architecture
- [x] `docs/partner-programs.md` — vendor partner research
- [x] `mcp/README.md` — package overview

---

## 3. Brand assets

- [x] `mcp/brand/openlawfirm-mcp-logo.svg` exists (Electric Indigo, 512×512)
- [ ] PNG variant at 512×512 generated
- [ ] PNG variant at 256×256 generated
- [ ] PNG variant at 128×128 generated
- [ ] Favicon (ICO or PNG at 32×32) deployed at `https://mcp.openlawfirm.openscaffoldlabs.com/favicon.ico`
- [ ] Favicon visually matches the submitted logo (Anthropic verifies this)
- [ ] At least 3 promotional screenshots of the connector in use (see Demo Script for what to capture)

---

## 4. Policy and compliance

### Open Scaffold Labs side
- [ ] LICENSE in repo root (MIT) — done
- [ ] SECURITY.md responsible disclosure policy — done
- [ ] `security@openscaffoldlabs.com` mailbox or group exists and is monitored
- [ ] `support@openscaffoldlabs.com` mailbox or group exists and is monitored
- [ ] Privacy policy on openscaffoldlabs.com mentions the OpenLawFirm connector
- [ ] Terms of service for the OpenLawFirm SaaS offering exist and reference Claude connector usage

### Anthropic submission requirements
- [ ] Read the [Connectors Directory submission policy](https://claude.com/docs/connectors/building/submission) end to end
- [ ] Read the [Anthropic Acceptable Use Policy](https://www.anthropic.com/legal/aup) — confirm the connector doesn't violate
- [ ] Confirm: no PII transmitted in URL query strings
- [ ] Confirm: HTTPS-only with valid certificate
- [ ] Confirm: Origin-header validation prevents requests from non-Claude clients
- [ ] Confirm: all destructive tools require explicit user consent each time (the `time_entry_create` confirmation flow)

---

## 5. Submission form

The actual submission is a form at https://claude.com/docs/connectors/building/submission. Fields we need to fill:

- [ ] **Server name:** `OpenLawFirm`
- [ ] **Description (short, 1–2 sentences):** "Drive law firm practice management workflows from Claude — matters, time, trust accounting, documents, invoices, and calendar."
- [ ] **Description (long, 2–3 paragraphs):** Pull from `docs/connector/index.md` "What it does" + "Who it's for" sections.
- [ ] **Category:** Legal
- [ ] **Publisher:** Open Scaffold Labs, LLC
- [ ] **Logo URL:** GitHub-hosted raw URL or the deployed `/favicon.ico` path
- [ ] **Documentation URL:** `https://open-scaffold-labs.github.io/OpenLawFirm/connector/`
- [ ] **Server URL:** `https://mcp.openlawfirm.openscaffoldlabs.com/mcp`
- [ ] **OAuth authorization URL:** `https://auth.openscaffoldlabs.com/authorize`
- [ ] **OAuth token URL:** `https://auth.openscaffoldlabs.com/token`
- [ ] **OAuth scopes:** `openlawfirm:matter:read openlawfirm:time:write openlawfirm:document:read openlawfirm:invoice:read openlawfirm:trust:read openlawfirm:calendar:read`
- [ ] **Promotional screenshots:** 3+ uploaded
- [ ] **Support contact:** `support@openscaffoldlabs.com`
- [ ] **Security contact:** `security@openscaffoldlabs.com`
- [ ] **Tags:** `legal`, `practice-management`, `law-firm`, `time-tracking`, `iolta`, `open-source`

---

## 6. Post-submission

After submitting, Anthropic typically responds within 2–4 weeks with one of:

- **Approved** — the connector goes live in the Directory. We're done with Sprint 2.
- **Conditional approval** — minor changes requested (annotations, doc clarifications). Address and resubmit.
- **Rejected** — substantial changes required. Read the rejection reason, fix, resubmit.

While waiting:

- [ ] Monitor the support email account for Anthropic's reviewer messages
- [ ] Don't make breaking changes to the MCP server or its OAuth surface (you can iterate, but breaking the submission's claims = re-review)
- [ ] Start Sprint 3 (native adapters) per IMPLEMENTATION.md

## Rejection reasons to avoid (per Anthropic FAQ)

- Missing `readOnlyHint` / `destructiveHint` annotations — ~30% of rejections
- HTTPS certificate issues — ~10%
- Documentation URL that returns 404 or requires login — ~10%
- Tool descriptions that are too vague or marketing-y rather than functional — ~10%
- Connectors that don't actually work end-to-end during reviewer testing — varies

We're well positioned on the first three. The fourth is a writing-quality issue (descriptions are concrete and functional in the current scaffold). The fifth is gated entirely on Matt's wiring quality — assumed solid.
