---
title: OpenLawFirm Connector — Privacy and Data Handling
---

# Privacy and Data Handling

The OpenLawFirm connector is designed for use in regulated legal practice. Attorney-client privilege, bar ethics rules, and (in many jurisdictions) specific data retention and breach-notification requirements apply to every byte that moves between Claude and OpenLawFirm. This page documents how the connector handles your data.

## What the connector stores

**Persistent:**

- Your OAuth client credentials (encrypted at rest)
- An audit log entry for each tool invocation, including: timestamp, authenticated user ID, tool name, and high-level inputs (e.g., "matter_search with status=open"). The audit log **does not** include matter content, client PII, document contents, or full input strings beyond field-level metadata.

**Not stored:**

- Matter records, client records, time entries, documents, invoices, trust data, or any other content returned by tool calls
- Document contents downloaded from OpenLawFirm
- Claude conversation history
- Any data marked privileged in OpenLawFirm

Every tool call is a real-time pass-through. When a tool returns, the data flows back to Claude; the connector keeps nothing.

## Where data flows

```
Claude client (your browser/desktop/IDE)
   │  HTTPS, your OAuth token in Authorization header
   ▼
openlawfirm-mcp connector  ──── validates JWT ───▶ openscaffold-oauth (JWKS only, no round-trip per call)
   │  HTTPS, service-to-service auth with your user ID
   ▼
Your firm's OpenLawFirm API
   │  Direct SQL
   ▼
Your firm's PostgreSQL database
```

The connector is hosted by Open Scaffold Labs, LLC on US-based infrastructure (AWS us-west-2 region for the v0.1 deployment). Your firm's OpenLawFirm instance is hosted wherever your firm chose — either self-hosted on your infrastructure or on the Open Scaffold Labs hosted SaaS offering (also US-based).

If your firm self-hosts OpenLawFirm, the connector still calls *your* OpenLawFirm API directly. The connector itself is the only piece running on Open Scaffold Labs infrastructure in that deployment.

## Encryption

- All connections between Claude, the connector, and OpenLawFirm use TLS 1.3.
- OAuth credentials and refresh tokens are encrypted at rest using AES-256-GCM with keys rotated every 90 days.
- Audit log entries are stored in an append-only table in the connector's database; they cannot be modified or deleted by the connector application logic.

## Access controls

The connector enforces the same matter-level access controls as the OpenLawFirm UI. If you don't have access to a matter in OpenLawFirm, you can't see it through the connector, regardless of how you phrase the query in Claude. Every tool call:

1. Validates your OAuth access token signature using the JWKS published by `openscaffold-oauth`
2. Extracts your user ID and granted scopes from the token
3. Forwards the user ID and scopes to OpenLawFirm's existing authorization middleware
4. Returns only the data OpenLawFirm authorizes for your user

The connector never bypasses OpenLawFirm's access controls. There is no "service account" mode in v0.1.

## Privileged data

The OpenLawFirm platform allows individual matters and individual documents to be marked **privileged**. Privileged items have additional access controls and are excluded from certain query surfaces.

The connector respects these markings:

- `matter_search` excludes privileged matters from results unless your scope explicitly includes `openlawfirm:privileged:read` (not granted by default; admin must explicitly enable)
- `document_search` excludes privileged documents from results by the same rule
- `matter_get` returns matter metadata but redacts privileged content fields if the user lacks the privileged scope

## Audit trail

Every tool invocation creates an entry in two audit logs:

1. **The connector's own audit log** — stores tool name, user ID, timestamp, and field-level input metadata (not values)
2. **OpenLawFirm's `olf_audit_log`** — captures the underlying API call as if it had been made through the UI

The dual logging means that, if a bar grievance or court order requires reconstruction of what an attorney did when, you have both surfaces to query.

## Data deletion and revocation

To stop the connector from accessing your OpenLawFirm data:

- **Revoke from Claude side:** Claude settings → Connectors → OpenLawFirm → Revoke access. Immediate effect.
- **Revoke from OpenLawFirm side:** OpenLawFirm Settings → Authorized Applications → Claude → Revoke. Immediate effect.

Either revocation invalidates the OAuth refresh token. The next tool call from Claude will fail with `invalid_token` and prompt re-authentication.

To delete audit log entries: contact `support@openscaffoldlabs.com`. We retain audit logs for 7 years by default to support bar grievance defense; on request we can delete entries older than the minimum required by your jurisdiction.

## Third-party sharing

Open Scaffold Labs does **not** share your data with third parties for marketing, model training, or any non-operational purpose. The connector exists to route your data between Claude and your OpenLawFirm instance; Anthropic and Open Scaffold Labs are the only two parties involved in that routing.

Anthropic's data handling for Claude is governed by [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy) and the [Claude commercial terms](https://www.anthropic.com/legal/commercial-terms). For Team and Enterprise plans, conversation content is not used to train Anthropic's models by default.

## Compliance posture

The OpenLawFirm platform is designed to support a firm's compliance with:

- **ABA Model Rules of Professional Conduct**, particularly Rules 1.1 (Competence — including technological competence), 1.6 (Confidentiality), and 5.3 (Responsibilities Regarding Nonlawyer Assistance)
- **State bar opinions on AI use in legal work** — varies by jurisdiction; the AI activity log in `olf_audit_log` is designed to support disclosure requirements where they exist
- **HIPAA** — for firms handling protected health information in personal injury, medical malpractice, or insurance defense work, OpenLawFirm and the connector support BAA-eligible deployments. Contact `support@openscaffoldlabs.com` for BAA terms.

The connector is **not** a substitute for a firm's own compliance program. Your firm remains responsible for ensuring that your use of Claude and the OpenLawFirm connector is consistent with your jurisdiction's bar rules and any client confidentiality obligations.

## Reporting a security incident

If you believe the connector has exposed data inappropriately, email `security@openscaffoldlabs.com` immediately. We commit to:

- Acknowledging the report within 3 business days
- Providing an initial assessment within 10 business days
- Coordinating with you on disclosure timing

Full responsible disclosure policy: [SECURITY.md](https://github.com/Open-Scaffold-Labs/OpenLawFirm/blob/main/SECURITY.md).

## Questions

`support@openscaffoldlabs.com` — general questions

`security@openscaffoldlabs.com` — security and vulnerability reports

`dale@openscaffoldlabs.com` — privacy questions and BAA requests
