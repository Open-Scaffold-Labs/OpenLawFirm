# Contributing to OpenLawFirm

Thanks for your interest in OpenLawFirm. This project is in early development, and we're moving fast — but we welcome contributions, especially from people working in or alongside small and midsize law firms who understand the workflows we're trying to improve.

## Before you start

OpenLawFirm is part of the [Open Scaffold Labs](https://openscaffoldlabs.com) ecosystem. Several conventions and shared dependencies span the whole ecosystem; familiarity with them will make your contribution flow smoothly.

For substantial work (new modules, schema changes, API surface changes), please open an issue first to discuss. We'd rather align on direction before you invest a weekend.

For small contributions (bug fixes, documentation improvements, test additions), feel free to open a PR directly.

## Development setup

Prerequisites:

- Node.js 20+
- PostgreSQL 15+
- The `@openscaffold/core` and `@openscaffold/integrations` packages available locally via `file:` reference

```bash
git clone https://github.com/Open-Scaffold-Labs/OpenLawFirm.git
cd OpenLawFirm
cd client && npm install
cd ../server && npm install
```

Database setup, demo credentials, and port configuration are documented in `CLAUDE.md`.

## Code conventions

The OpenLawFirm codebase follows the Open Scaffold ecosystem conventions:

- **React components**: PascalCase filenames (e.g., `MatterDetail.jsx`)
- **Route files**: kebab-case filenames (e.g., `time-entries.js`)
- **API paths**: `/api/kebab-case` (e.g., `/api/time-entries`)
- **Database tables**: `olf_snake_case` (the `olf_` prefix scopes OpenLawFirm tables within the shared ecosystem schema)
- **CSS**: Tailwind utility classes only — no custom CSS
- **localStorage keys**: prefixed with `olf_` (e.g., `olf_token`)
- **Document generation**: when generating `.docx` files, follow `openscaffold-core/DOCUMENT-STANDARDS.md` (Electric Indigo `#4F46E5` title block, Times New Roman 11pt, justified text, navy `#1B3A5C` headings)

### Backend specifics

- PostgreSQL is accessed with direct SQL queries — we deliberately do not use an ORM
- Seed files must use the `module.exports = async function() { ... }` pattern; standalone scripts with `process.exit()` will crash the server

## Branching and commits

- `main` is the canonical branch. It should always reflect a known-good state.
- Feature branches: `feature/<short-description>` (e.g., `feature/three-way-reconciliation`)
- CI / infrastructure branches: `ci/<short-description>`
- Documentation branches: `docs/<short-description>`

### Commit messages

We follow a lightweight convention: a short imperative subject line, optionally followed by a blank line and a longer body explaining the *why* (not just the *what*).

Examples:

```
Add three-way reconciliation to trust route

Implements bank statement ↔ trust journal ↔ per-client sub-ledger
reconciliation as required by bar regulations. Surfaces out-of-balance
state as a blocker on the matter dashboard.
```

```
Fix LEDES 1998B export for multi-line invoices
```

When work is AI-assisted, please add a `Co-Authored-By:` trailer to your commits per [GitHub's commit attribution conventions](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors).

## Pull request guidelines

- One PR, one logical change. Don't bundle unrelated fixes.
- Reference the issue your PR addresses in the description (e.g., "Closes #42").
- Include a brief explanation of *why* the change is needed and *how* it works, especially for non-obvious changes.
- For schema changes: include migration notes and call out any impact on existing data.
- For changes that touch money-handling routes (`time-entries`, `invoices`, `trust`, `payments`): include tests. We aim for high coverage on anything that affects billing or client funds.

## Testing

The test harness is in early development. As we add it, we'll document conventions here. For now:

- New features that touch money should ship with tests.
- New API routes should ship with at least a happy-path integration test.
- Schema migrations should ship with a rollback path.

## Legal industry awareness

If you're contributing code that touches legal-specific workflows, please familiarize yourself with the relevant standards:

- **LEDES** (Legal Electronic Data Exchange Standard) for invoice formats
- **UTBMS** (Uniform Task-Based Management System) for activity and task codes
- **IOLTA** (Interest on Lawyers' Trust Accounts) and the three-way reconciliation requirement
- Your jurisdiction's specific bar rules — these vary by state

Mishandling client trust funds is a disbarment-level violation. We take compliance seriously and expect contributors to do the same.

## Code of conduct

We expect contributors to be respectful, constructive, and welcoming. We do not yet have a formal Code of Conduct, but the principles of the [Contributor Covenant](https://www.contributor-covenant.org/) reflect our expectations.

## Questions

If you're unsure about anything — conventions, scope, whether something is a good first contribution — open an issue or email `dale@openscaffoldlabs.com`. We'd rather answer questions early than discover misalignment in a PR.
