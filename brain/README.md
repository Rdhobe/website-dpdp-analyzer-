# Brain Documentation Guide

The `brain/` directory is the knowledge base, decision history, and operating manual for the **DPDP Website Compliance Auditor** project. It exists so that humans and AI coding agents can understand the project without re-discovering it every session.

## What This Directory Is

- A structured, linked documentation system.
- A record of verified facts about the codebase.
- A place to separate **implemented behavior** from **planned requirements**.
- A durable memory for decisions, tasks, tests, and known limitations.

## What This Directory Is Not

- Not a replacement for source code. Code and executable configuration are authoritative.
- Not a legal opinion or certificate of DPDP compliance.
- Not a place for secrets, API keys, passwords, or private credentials.
- Not a changelog of guesses. Unverified history is never recorded.

## Files and Their Roles

| File | Purpose | Authoritative For |
| --- | --- | --- |
| [BRAIN.md](./BRAIN.md) | Central index, current status, priorities | Navigation and project snapshot |
| [AGENTS.md](./AGENTS.md) | Instructions for AI coding agents | Agent behavior and change workflow |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, components, data flow | Architectural boundaries |
| [DECISION.md](./DECISION.md) | Architecture and technology decisions | Decision history and rationale |
| [DESIGN.md](./DESIGN.md) | UI/UX principles, tokens, components | Design system |
| [FEATURES.md](./FEATURES.md) | Feature registry with verified status | Feature status |
| [FLOW.md](./FLOW.md) | User journeys and business flows | Application flows |
| [MEMORY.md](./MEMORY.md) | Concise persistent context for future sessions | Session-to-session memory |
| [RULES.md](./RULES.md) | Enforceable development conventions | Coding and process rules |
| [SECURITY.md](./SECURITY.md) | Security controls, threats, requirements | Security posture |
| [TASKS.md](./TASKS.md) | Prioritized actionable work | Task tracking |
| [TESTCASE.md](./TESTCASE.md) | Existing and proposed test coverage | Test plan and status |
| [DATABASE.md](./DATABASE.md) | Schema, migrations, data lifecycle | Database design |
| [PRD.md](./PRD.md) | Product requirements and scope | Approved product requirements |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Third-party services and SDKs | External integrations |
| [API.md](./API.md) | API reference | API contracts |
| [CHANGES_LOG.md](./CHANGES_LOG.md) | Chronological change record | Change history |
| [Project requirements.md](./Project%20requirements.md) | Original product/engineering brief | Source requirements |

## Recommended Reading Order

### For a new developer

1. [BRAIN.md](./BRAIN.md) — what the project is and where it stands.
2. [PRD.md](./PRD.md) — what must be built and why.
3. [ARCHITECTURE.md](./ARCHITECTURE.md) — how the system is structured.
4. [FEATURES.md](./FEATURES.md) — what exists today.
5. [TASKS.md](./TASKS.md) — what to work on next.
6. [RULES.md](./RULES.md) and [AGENTS.md](./AGENTS.md) — how to make changes.

### For an AI coding agent

1. [BRAIN.md](./BRAIN.md)
2. [AGENTS.md](./AGENTS.md)
3. [MEMORY.md](./MEMORY.md)
4. The documentation relevant to the task (for example [ARCHITECTURE.md](./ARCHITECTURE.md), [API.md](./API.md), [SECURITY.md](./SECURITY.md)).
5. The actual source files before editing.

## Source-of-Truth Rules

When documentation and implementation disagree, use this precedence:

1. **Source code and executable configuration** — current behavior, dependencies, routes, and UI.
2. **Migration files and schema definitions** — database structure (none exist yet).
3. **Automated tests** — evidence of tested behavior, not proof of full compliance.
4. **`PRD.md` / `Project requirements.md`** — approved or requested requirements. Requirements are not evidence of implementation.
5. **`DECISION.md`** — why important choices were made.
6. **`TASKS.md`** — what work remains.
7. **`CHANGES_LOG.md`** — what changed and when.
8. **`BRAIN.md`** — index only; it must not duplicate full documents.

If you find a discrepancy, verify actual behavior in code first, then correct the documentation. Do not change working code merely to match stale documentation.

## Status Vocabulary

Use these labels consistently across the brain:

- **Implemented** — verified in source code and, where applicable, in tests.
- **Partial** — some real code exists but the feature is incomplete.
- **Planned** — described in requirements or tasks, not built.
- **Proposed** — suggested design not yet approved.
- **Blocked** — cannot proceed without a decision or dependency.
- **Deprecated** — retained for history, should not be used.

## When to Update the Brain

Update documentation in the same change as the code whenever a change affects:

- Architecture or module boundaries → `ARCHITECTURE.md`, possibly `DECISION.md`.
- API routes or contracts → `API.md`.
- Database schema or migrations → `DATABASE.md`.
- External services → `INTEGRATIONS.md`.
- Security controls → `SECURITY.md`.
- Features or workflows → `FEATURES.md`, `FLOW.md`.
- Tests → `TESTCASE.md`.
- Tasks or priorities → `TASKS.md`.
- Meaningful completed work → `CHANGES_LOG.md`.
- UI tokens or components → `DESIGN.md`.

Update `MEMORY.md` only with short, durable facts that reduce future rediscovery. It is not a second copy of the other files.

## Conflict Prevention Checklist

Before committing documentation:

- [ ] Every claim about implemented behavior is backed by a file path or command output.
- [ ] Planned work is labeled **Planned** or **Proposed**, not written as if it exists.
- [ ] Dates are accurate; no historical entries are invented.
- [ ] Internal links resolve to real files.
- [ ] No secrets, credentials, tokens, or private URLs are included.
- [ ] Status in `FEATURES.md`, `TASKS.md`, and `CHANGES_LOG.md` is consistent.
- [ ] Legal references are not invented; unverified legal text is marked as requiring verification.

## Current Project Location

- Brain and requirements: `C:\projects\website dpdp analyzer\`
- Application code: `C:\projects\website dpdp analyzer\dpdp-compliance-auditor\`
