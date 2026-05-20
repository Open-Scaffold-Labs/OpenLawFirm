# Security Policy

OpenLawFirm handles attorney-client privileged information and client trust funds. We take security seriously and ask the same of researchers and contributors.

## Reporting a vulnerability

**Please do not file public GitHub issues for security vulnerabilities.** Public disclosure of an unpatched vulnerability puts every firm running OpenLawFirm at risk.

Instead, please email:

- **`security@openscaffoldlabs.com`** (preferred) — monitored by both Dale Raaen and Matt Lavin
- **`dale@openscaffoldlabs.com`** (alternate)

Please include:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce, including any relevant configuration, payloads, or proof-of-concept code
- Your name and contact information (so we can credit you in the eventual disclosure if you wish)
- Whether you've shared the vulnerability with anyone else

We commit to:

- Acknowledging receipt of your report within **3 business days**
- Providing an initial assessment within **10 business days**
- Coordinating with you on disclosure timing if the vulnerability is confirmed
- Crediting you in the public advisory if you wish to be credited

## Scope

The following are in scope for vulnerability reports:

- Authentication and authorization bypasses in the OpenLawFirm server or client
- SQL injection or data exposure via the API surface
- Cross-site scripting (XSS), cross-site request forgery (CSRF), or other client-side attacks
- Insecure handling of trust-account or payment data
- Vulnerabilities in the `openlawfirm-mcp` connector (when published)
- Vulnerabilities in OpenLawFirm-specific code in the shared `@openscaffold/core` and `@openscaffold/integrations` packages

The following are **out of scope**:

- Vulnerabilities in third-party services (DocuSeal, Stripe, etc.) — report to the vendor
- Issues that require physical access to a user's machine or active social engineering
- Best-practice recommendations that do not represent an exploitable vulnerability (please file as a regular issue or PR instead)
- Vulnerabilities in dependencies that have been patched but not yet updated — file a PR to update the dependency
- Denial-of-service attacks that require excessive resources

## Responsible disclosure

We follow standard responsible disclosure practices:

1. You report the vulnerability privately.
2. We confirm the vulnerability and develop a fix.
3. We coordinate a disclosure timeline with you (typically 30–90 days, faster for critical issues).
4. We release the patched version.
5. We publish a security advisory crediting you (if you wish).

## Production deployments

If your law firm is running OpenLawFirm in production and discovers what may be a security incident affecting client data, please contact us immediately at `security@openscaffoldlabs.com` so we can help you assess the situation and notify other affected firms if necessary.

## Compliance context

OpenLawFirm is designed for use by law firms, who operate under professional obligations including attorney-client privilege, state bar ethics rules, and (in many jurisdictions) specific data retention and breach-notification requirements. We aim to ship a platform that supports a firm's compliance posture rather than undermining it. If you find a defect that materially affects a firm's ability to meet its compliance obligations, please flag it as a security concern.
