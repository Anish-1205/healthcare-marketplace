# Handoff

Reviewed: 2026-10-31. Written so another AI (or engineer) can continue this project using only the docs in this folder. For learning and presenting the application, start with [PRESENTATION_GUIDE](PRESENTATION_GUIDE.md); use this file for engineering continuation.

## What CareBridge is

A demo, multi-tenant healthcare marketplace: patients book doctors, receive prescriptions, order medicines from a chosen pharmacy, and book labs. Clinics/hospitals/pharmacies get an organization portal; platform staff get an admin portal. TypeScript pnpm monorepo — Express + Prisma + PostgreSQL API, React SPA, shared RBAC/contracts package. Full narrative: [PROJECT_OVERVIEW](PROJECT_OVERVIEW.md). System diagrams and request flow: [ARCHITECTURE](ARCHITECTURE.md).

**It is explicitly a demo.** Payments, delivery, and video consultation are simulated — see [DECISIONS_LOG](DECISIONS_LOG.md) D03. It is not production-ready for real patient data or real commerce.

## Current state

- `pnpm -w typecheck` passes cleanly across all 3 workspaces as of this review — see [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md).
- `apps/web`'s `lint` script is broken (ESLint not installed, no config) — no working static-analysis gate exists beyond `tsc`.
- Strict TypeScript throughout, zero `any`/`@ts-ignore` found in either app.
- API test suite (22 files, ~2,910 lines) includes negative-authorization tests; web unit coverage is thin (2 files); Playwright e2e covers full user journeys. Full suite (`pnpm test:demo`) was **not** run against a live database in this review.
- Capability-by-capability status (done/partial/missing): [FEATURES](FEATURES.md).

## Where to look for what

| Question | Doc |
| --- | --- |
| What does the product do, who are the actors? | [PROJECT_OVERVIEW](PROJECT_OVERVIEW.md) |
| How do requests flow, what are the components? | [ARCHITECTURE](ARCHITECTURE.md) |
| What's implemented vs. partial vs. missing? | [FEATURES](FEATURES.md) |
| What languages/frameworks/versions are used? | [TECH_STACK](TECH_STACK.md) |
| What are the database models, relations, constraints? | [DATABASE_SCHEMA](DATABASE_SCHEMA.md) |
| What API endpoints exist, with what auth? | [API_REFERENCE](API_REFERENCE.md) |
| What are the security findings (S01–S09)? | [SECURITY_AUDIT](SECURITY_AUDIT.md) |
| What are the code-quality findings (CQ01–CQ06)? | [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md) |
| What are the performance findings (PF01–PF07)? | [PERFORMANCE_AUDIT](PERFORMANCE_AUDIT.md) |
| What's the prioritized engineering backlog? | [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md) |
| What's needed before real patient data / real commerce? | [PRODUCTION_READINESS](PRODUCTION_READINESS.md) |
| How do I set up and run this locally? | [ENVIRONMENT_AND_SETUP](ENVIRONMENT_AND_SETUP.md) |
| What coding patterns should I follow? | [CONVENTIONS](CONVENTIONS.md) |
| Why is it built this way? | [DECISIONS_LOG](DECISIONS_LOG.md) (all entries are inferred — no ADRs exist) |
| Where is everything in the repo? | [FILE_MAP](FILE_MAP.md) |

`DEMO_GUIDE.md`, `TESTING.md`, and `DEMO_VERIFICATION.md` are current operational references. `API.md` and `DATABASE.md` are short compatibility summaries; prefer `API_REFERENCE.md` and `DATABASE_SCHEMA.md`. `IMPLEMENTATION_PLAN.md` records historical planning and should not override implemented code or current verification.

## Priority items across security, tech debt, and production readiness

**P0 — fix before any deployment beyond a fully-isolated demo:**
1. Password-reset token disclosure in production ([SECURITY_AUDIT](SECURITY_AUDIT.md) S01).
2. Shared/fallback demo passwords for staff/employee creation ([SECURITY_AUDIT](SECURITY_AUDIT.md) S02).

**P1 — required before real patient data or real commerce** (full list in [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md)):
- Cross-membership admin privilege leakage (S03), no session revocation (S04), no auth rate limiting (S05), incomplete prescription fulfillment checks (S06), unguarded destructive seed/reset (S07), logging/cache privacy gaps (S08), broad clinical access/audit gaps (S09).
- Non-functional lint gate, thin frontend unit coverage.
- Two unbounded list endpoints (`/admin/reviews`, `/favorites`), an unresolved same-patient booking race, and only partial frontend route splitting.
- Entirely absent real-world infrastructure: payment gateway, delivery/logistics integration, provider credential verification, email/SMS transport.

**Structural gaps not fixable by a code change alone** (see [PRODUCTION_READINESS](PRODUCTION_READINESS.md)): no deploy pipeline, no SPA hosting decision, no monitoring/log aggregation, no backup automation, compliance review not started.

## Recommended next steps

1. Fix the two P0 security items first — they are the smallest changes with the largest exposure (S01, S02 in [SECURITY_AUDIT](SECURITY_AUDIT.md)).
2. Get the lint gate working (or remove the dead script) so future changes have a real static-analysis check — [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md) CQ01.
3. Run `pnpm test:demo` against a disposable database to get a real, current pass/fail baseline — none of this review's claims about "tests exist" were verified as "tests pass" against live data.
4. Work through [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md) in order; it already sequences everything above by severity with links back to evidence.
5. Before any production planning conversation, walk through [PRODUCTION_READINESS](PRODUCTION_READINESS.md) as a literal checklist with whoever owns deployment/compliance decisions — several items there explicitly require legal/business judgment this documentation set cannot supply.

## How this documentation set was produced

Read-only review of the working tree: `apps/api/src`, `apps/api/prisma/schema.prisma` and migrations, `apps/web/src`, `packages/shared/src`, root/workspace `package.json` files, `tsconfig.*`, and `git log`. `pnpm -w typecheck` was executed and passed; `pnpm --filter @carebridge/web lint` was executed and failed (tooling not installed). No database was queried, no destructive command was run, and no file outside `docs/` was modified. Two `.env.example` files exist but could not be read in this session (sandbox permission denial); [env.ts](../apps/api/src/config/env.ts) was used instead as the authoritative environment-variable contract in [ENVIRONMENT_AND_SETUP](ENVIRONMENT_AND_SETUP.md).
