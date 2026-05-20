# Partner Program Access — Sprint 3 Prerequisites

**Status:** Draft v1 · 2026-05-19
**Owner:** Dale (signups, account setup)
**Critical path:** Some have 2–4 week lead times — start now if Sprint 3 is real

This memo lists each vendor whose adapter we plan to build in Sprint 3 (DocuSeal, Box, iManage, NetDocuments) plus Thomson Reuters and DocuSign (CONNECT-via-Claude, but useful for demo credentials). It documents how to apply for developer/sandbox access, what it costs, and what gates the process.

## Summary table

| Vendor | Adapter category | Sandbox access | Cost | Lead time | Action |
|---|---|---|---|---|---|
| **DocuSeal** | CONNECT-native (signature) | Self-host, instant | $0 (open source) | 0 days | Spin up locally + a hosted test instance |
| **Box** | CONNECT-native (DMS) | Box Developer Console | Free tier sufficient | 1 day | Sign up at developer.box.com |
| **iManage** | CONNECT-native (DMS) | iManage Universal API Developer track | Likely paid course + partner program | ~2–4 weeks | Apply via registration.imanage.com |
| **NetDocuments** | CONNECT-native (DMS) | ndConnect partner program (announced Jan 2026) | Partner program — unclear if free | ~2–3 weeks | Apply via netdocuments.com/partners |
| **DocuSign** | CONNECT-via-Claude | Developer account at developers.docusign.com | Free dev account | 1 day | For demo only |
| **Thomson Reuters / CoCounsel** | CONNECT-via-Claude | Sales conversation required | Enterprise pricing | ~4–6 weeks | Skip for v1.0 — talk to firms that already have it |

## Per-vendor detail

### 1. DocuSeal — easiest

DocuSeal is open source (AGPL-3.0). No partner program. No sandbox application. We can self-host instantly for development, and we have full source-code access.

- **Repo:** https://github.com/docusealco/docuseal
- **Docs:** https://docs.docuseal.com
- **What we do:** spin up a local Docker container for dev, then deploy a hosted DocuSeal instance for the demo environment. Wire the `@openscaffold/integrations` adapter against the local instance first, then point at the hosted one.
- **Cost:** $0 self-hosted. Their cloud product is $25/month if we don't want to self-host.
- **Recommendation:** self-host. Matches the OpenLawFirm "no vendor lock-in" pitch.
- **Lead time:** zero. Start whenever.

### 2. Box — easy

Box has a mature developer program with a generous free tier. Best-in-class developer documentation.

- **Portal:** https://developer.box.com
- **Sign up:** create a Box developer account (free), then create a Custom App in the Developer Console
- **Auth model:** OAuth 2.0 (matches our `openscaffold-oauth` flow) or JWT auth for server-to-server
- **Sandbox:** the developer account itself is the sandbox. No separate process needed.
- **Cost:** free developer account; production usage is metered, but Box Business starts at $20/user/month if a customer firm needs it
- **What we need:** Custom App with `read all files` and `write all files` scopes, plus the App Authorization workflow so we can act on behalf of a Box user
- **Lead time:** ~1 day to register, get API keys, and call the first endpoint
- **Recommendation:** start in Sprint 1 even though the adapter is Sprint 3 work. Free to register, removes any Sprint 3 risk.

### 3. iManage — gated

iManage is the dominant mid-market DMS in law firms, but their developer program has more friction than Box.

- **Portal:** https://registration.imanage.com — entry point for developer registration
- **Required course:** "iManage Universal API Developer" course is listed as a registration step. Whether it's required or optional for partner access isn't clear from public docs — likely required for "official" partner status, optional if we just want to call the API.
- **Auth model:** OAuth 2.0 required. Every API client must be registered with iManage and authorized.
- **Docs:** https://docs.imanage.com (general docs) and https://imanage.docs.apiary.io (API reference)
- **Sandbox:** iManage Cloud has a sandbox environment for partners. Access is granted through the partner program.
- **Cost:** unclear from public materials. The developer course appears to be a paid offering. Partner program tier costs vary.
- **What we need:**
  1. Register at registration.imanage.com
  2. Complete the developer registration questionnaire
  3. Register our client application (this gets us API client credentials)
  4. Request sandbox tenant access for development
- **Lead time:** 2–4 weeks based on community reports for the registration + sandbox provisioning. Variable.
- **Recommendation:** **start this week.** This is the longest-lead-time dependency in Sprint 3. Even if the OAuth memo decision takes a few days, starting the iManage registration is independent and slow-moving.
- **Risk:** if iManage partner gating is too expensive or too slow, we ship Sprint 3 with NetDocuments + Box only, and add iManage post-v1.0.

### 4. NetDocuments — newly accessible

NetDocuments announced **ndConnect** in January 2026 — a new developer-friendly architecture explicitly aimed at AI integrations. They partnered with Harvey and Legora at launch, which suggests they're actively courting AI vendors. Good timing for us.

- **Portal:** https://www.netdocuments.com/partners/partner-program/
- **Announcement:** https://www.netdocuments.com/company-news/netdocuments-partners-with-legora-harvey-ndconnect/
- **Auth model:** OAuth 2.0
- **API:** REST API at apitracker.io/a/netdocuments and the official developer portal
- **Sandbox:** the partner program provides sandbox environments
- **Cost:** partner program tier costs not public; the AI partnerships with Harvey/Legora suggest they're willing to onboard AI integration partners on reasonable terms
- **What we need:**
  1. Apply via the Partner Program page
  2. Reference ndConnect specifically in the application — we're an AI-adjacent integration partner, not a reseller
  3. Wait for partner manager outreach
  4. Sign a partner agreement, get sandbox credentials
- **Lead time:** 2–3 weeks based on the partner application → first-touch pattern
- **Recommendation:** **start this week.** The ndConnect program is fresh — being an early integration partner has marketing value beyond just the technical access.

### 5. DocuSign — easy (for demo only)

DocuSign is CONNECT-via-Claude per the integration matrix — we don't build a native adapter. But we'll want a DocuSign developer account for the design-partner demo so we can show the Claude → DocuSign flow.

- **Portal:** https://developers.docusign.com
- **Sign up:** free developer account, instant
- **Sandbox:** the dev account is itself a sandbox. Test envelopes don't cost anything.
- **Cost:** free dev account; production DocuSign Business is $40/user/month if a customer firm needs it
- **What we need:** a dev account, an integration key, and an example signed envelope to demo
- **Lead time:** ~1 day
- **Recommendation:** Sprint 2 or 3 — for the demo, not for production code

### 6. Thomson Reuters / CoCounsel Legal — gated

Thomson Reuters is enterprise software with enterprise sales motion. There's no public developer portal for CoCounsel Legal — it's accessed via the MCP connector Anthropic ships, which means firms reach it through their existing Westlaw + CoCounsel subscription.

- **What we need (for demo):** access to a CoCounsel-equipped Claude session. Either we get our own Westlaw + CoCounsel subscription (~$1,200+/month per seat — not justified for v1.0) or we run the demo with a design-partner firm that already has Westlaw.
- **Lead time:** 4–6 weeks if we pursued our own subscription (sales cycle)
- **Recommendation:** **skip for v1.0 demo prep.** Use Free Law Project / Midpage / Descrybe for the legal research portion of the design-partner demo. Position "Westlaw / Lexis via Claude" as a talking point, not a demo step.

## Sequenced action list for Dale this week

1. **Today or tomorrow:** Apply to iManage partner / developer registration at https://registration.imanage.com. This has the longest lead time. Filling out the form takes ~30 minutes.
2. **Today or tomorrow:** Apply to NetDocuments ndConnect partner program at https://www.netdocuments.com/partners/partner-program/. Reference ndConnect specifically. ~30 minutes.
3. **This week:** Create a Box developer account at https://developer.box.com. Set up a Custom App. ~1 hour total.
4. **Next week:** Spin up DocuSeal locally for dev work. ~1 hour for Matt or you.
5. **Sprint 2 or 3:** Register a DocuSign developer account for demo purposes. ~30 min.

Total time this week: ~2 hours of forms and account creation. Total lead time saved by starting now: 2–4 weeks (the iManage approval).

## What we're explicitly not doing this week

- No Thomson Reuters / Westlaw outreach (skip for v1.0)
- No LexisNexis outreach (CONNECT-via-Claude, no adapter needed)
- No partner program signups for vendors not in our Sprint 3 punch list (Ironclad, Datasite, Relativity, Everlaw, Harvey, Solve Intelligence, Definely — all DEFER or via-Claude)

## References

- [iManage developer registration](https://registration.imanage.com/pages/uapi-developer)
- [iManage API documentation](https://imanage.docs.apiary.io/)
- [NetDocuments Partner Program](https://www.netdocuments.com/partners/partner-program/)
- [NetDocuments ndConnect announcement (January 2026)](https://www.netdocuments.com/company-news/netdocuments-partners-with-legora-harvey-ndconnect/)
- [Box Developer portal](https://developer.box.com)
- [DocuSeal open source](https://github.com/docusealco/docuseal)
- [DocuSign Developer portal](https://developers.docusign.com)
