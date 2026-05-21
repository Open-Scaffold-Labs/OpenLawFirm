---
title: Installing the OpenLawFirm Connector for Claude
---

# Installing the OpenLawFirm Connector

This guide walks you through installing the OpenLawFirm connector in Claude and authorizing it to access your firm's OpenLawFirm instance.

## Prerequisites

- A paid Claude subscription (Pro, Max, Team, or Enterprise)
- An OpenLawFirm account at a firm that runs the OpenLawFirm platform
- Permission to authorize third-party connectors for your Claude workspace (Team and Enterprise admins set this policy)

## Step 1 — Install from the Directory

1. Sign in to [claude.ai](https://claude.ai).
2. Open the [Connectors Directory](https://claude.ai/directory/connectors).
3. Search for **OpenLawFirm** or browse the **Legal** category.
4. Click **Install**.

If you're on a Team or Enterprise plan, your admin may need to approve the connector before it appears in your personal connector list. Ask your admin if you don't see it after installing.

## Step 2 — Sign in to OpenLawFirm

The first time you invoke an OpenLawFirm tool in Claude, you'll be redirected to your firm's OpenLawFirm sign-in page. Sign in with your normal OpenLawFirm credentials.

If your firm uses a self-hosted OpenLawFirm deployment, Claude will ask for your firm's OpenLawFirm URL (e.g., `https://openlawfirm.your-firm.com`) the first time. After that, Claude remembers it.

## Step 3 — Review and approve the scopes

After sign-in, you'll see a consent screen listing the scopes Claude is requesting. Each scope corresponds to one type of data the connector can access:

| Scope | What it allows |
|---|---|
| `openlawfirm:matter:read` | Search matters and retrieve matter detail |
| `openlawfirm:time:write` | Create new time entries on matters |
| `openlawfirm:document:read` | Search and retrieve documents |
| `openlawfirm:invoice:read` | Query invoice status and balances |
| `openlawfirm:trust:read` | Query IOLTA trust balances |
| `openlawfirm:calendar:read` | Query upcoming deadlines and events |

Approve the scopes you're comfortable with. You can decline individual scopes — tools that require declined scopes will fail with a clear error message in Claude.

## Step 4 — Try a first query

Once the consent flow completes, you're done. Try a query in Claude:

> *Show me my open matters with deadlines this week.*

Claude will use `matter_search` and `calendar_query` to answer. If the tools work and you see results, you're set up.

## Common issues

### "The OpenLawFirm connector could not authenticate."

Your access token may have expired. Sign out and back in via the connector settings in Claude.

### "Missing required scope: openlawfirm:time:write"

You declined or revoked the `time:write` scope. To re-grant it, go to your Claude settings → Connectors → OpenLawFirm → Manage scopes.

### "Could not reach the OpenLawFirm API"

Your firm's OpenLawFirm instance may be down, or the URL you provided is incorrect. Check with your firm's administrator.

### "This user does not have access to the requested matter."

The matter exists, but your OpenLawFirm role doesn't include access. The connector enforces the same matter-level access controls as the OpenLawFirm UI — it can never expose data you wouldn't see when signed in directly.

## Revoking access

To disconnect the OpenLawFirm connector from Claude:

1. Open Claude settings → Connectors → OpenLawFirm.
2. Click **Revoke access**.

To revoke from the OpenLawFirm side (e.g., if you no longer want Claude to be able to use your tokens):

1. Sign in to OpenLawFirm.
2. Go to Settings → Authorized Applications.
3. Find "Claude" and click **Revoke**.

Either method invalidates the OAuth refresh token and forces re-authentication on the next tool call.

## Admin notes (Team and Enterprise)

If you administer a Claude Team or Enterprise workspace, you can pre-approve the OpenLawFirm connector for your whole team:

1. Open Claude admin console → Connectors → Approved Connectors.
2. Click **Add Connector** → search for **OpenLawFirm**.
3. Configure which scopes are pre-approved for your workspace.

Pre-approval means your team members don't see the connector listing as "needs admin approval" — but they still need to individually authenticate to OpenLawFirm and approve scopes for their own account.

## Next steps

- [Tool reference](./tools.md) — what each of the 7 tools does, what inputs they take, what they return
- [Privacy and data handling](./privacy.md) — what data the connector stores, what it doesn't, how revocation works
- [GitHub repo](https://github.com/Open-Scaffold-Labs/OpenLawFirm) — source code, issues, contributions
