# Production readiness

Reviewed: 2026-09-29. Checklist-style assessment of what stands between this repository and handling real patient data or real commerce. Items reference [SECURITY_AUDIT](SECURITY_AUDIT.md) findings by ID (S01–S09) and [FEATURES](FEATURES.md) gaps. Anything requiring legal/compliance judgment is marked **requires legal review** rather than assessed here.

## Authentication and session management

- [ ] Remove production password-reset token disclosure — S01.
- [ ] Remove shared/fallback demo passwords for staff/employee creation — S02.
- [ ] Fix cross-membership admin permission checks — S03.
- [ ] Add session revocation (logout, password reset/change must invalidate existing tokens) — S04.
- [ ] Decide token storage strategy (localStorage vs. httpOnly cookie) and cross-site protections — S04.
- [ ] Add authentication rate limiting / lockout — S05.

## Data handling and clinical access

- [ ] Enforce prescription fulfillment rules (`validUntil`, refill/cumulative limits) — S06.
- [ ] Define and enforce least-privilege clinical access policy across platform/organization roles — S09.
- [ ] Add read-access auditing and tamper-evident retention for clinical records — S09.
- [ ] Provider credential/license verification (currently self-reported only) — [FEATURES](FEATURES.md).

## Demo/test infrastructure hardening

- [ ] Guard destructive seed/reset operations against non-disposable targets (production database, unmarked test database) — S07.
- [ ] Separate reference-data initialization from fixture seeding.
- [ ] Confirm demo mode (`DEMO_MODE`, `devToolsEnabled`) is fully disabled in the production environment configuration, not just defaulted off — [env.ts](../apps/api/src/config/env.ts).

## Logging, privacy, observability

- [ ] Redact sensitive free-text (query params, search terms) from request logs — S08.
- [ ] Clear (not just invalidate) client-side cache on every auth-state transition — S08.
- [ ] Replace the console-based logger ([logger.ts](../apps/api/src/utils/logger.ts)) with a structured logging/error-tracking sink (e.g. Sentry, structured JSON to a log aggregator) — see [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md).
- [ ] Add application performance monitoring / uptime alerting. No monitoring backend was found in the repository — **unverified** outside repo.

## Commerce and payments

- [ ] Integrate a real payment gateway; current `Payment` model is a database simulation with no external reconciliation — [DATABASE_SCHEMA](DATABASE_SCHEMA.md), [FEATURES](FEATURES.md).
- [ ] Implement real refund processing (current cancellation flow only updates simulated payment state).
- [ ] Integrate a real delivery/logistics provider; current delivery is a fixed demo agent with manually progressed status — [FEATURES](FEATURES.md).

## Communications

- [ ] Add an email transport (password reset, registration outcomes, order/appointment notifications currently have no external delivery channel — in-app only).
- [ ] Add SMS/push notification channel if required by the target market.
- [ ] Add an appointment-reminder scheduler (no background job/worker was found).

## Deployment and hosting

- [ ] Establish an application deploy pipeline; none was found in the repository (no CI config, no Dockerfile for the app itself beyond the Postgres Compose service referenced by `db:up`/`db:down` in [package.json](../package.json)).
- [ ] Decide and implement SPA hosting: Express does not serve the built SPA ([ARCHITECTURE](ARCHITECTURE.md)) — a static host with SPA fallback routing, TLS termination, and API routing/reverse proxy must be supplied.
- [ ] Configure production environment variables per [ENVIRONMENT_AND_SETUP](ENVIRONMENT_AND_SETUP.md), especially a non-default `JWT_SECRET` (the app already refuses to start in production with the dev default — confirmed in [env.ts](../apps/api/src/config/env.ts)).
- [ ] Add database backup/restore automation. None found in the repository; **unverified** outside repo.
- [ ] Add a graceful-shutdown deadline. `server.ts` closes the HTTP server and disconnects Prisma on termination but has no forced-shutdown timeout — see [ARCHITECTURE](ARCHITECTURE.md).

## Dependency and infrastructure security

- [ ] Run a dependency vulnerability scan (`npm audit`/`pnpm audit`/Snyk or equivalent) — not run in this review; status **unverified**.
- [ ] Verify TLS and storage encryption at the deployment target — **unverified**, out of repository scope.
- [ ] Establish a secrets-management approach for `.env` values in production (current setup is local `.env` files via `dotenv`) — **unverified** what the target deployment uses.

## Compliance (requires legal review)

- [ ] Assess applicable healthcare data regulations (e.g. HIPAA, India's DPDP Act, or other jurisdiction-specific rules) against the current data model and access patterns. **Requires legal review** — not assessed here.
- [ ] Assess retention/deletion requirements for clinical documents and consultation notes. **Requires legal review.**
- [ ] Assess whether simulated payment/delivery flows are acceptable to disclose to end users, or must be replaced before any real transaction. **Requires legal/business review.**

## Testing before go-live

- [ ] Run the full test suite (`pnpm test:demo` — typecheck → build → test → e2e) against a disposable database and confirm a clean pass; not executed in this session beyond `pnpm -w typecheck`, which passed. See [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md).
- [ ] Fix the non-functional `lint` script (CQ01) before treating "CI green" as a real quality gate.
- [ ] Add frontend unit test coverage for hooks currently exercised only via e2e (CQ02).

## Summary

The codebase has a coherent, testable demo architecture, but every P0/P1 item above is either a security defect that is trivial to exploit if deployed as-is (S01, S02), or an entirely absent piece of real-world infrastructure (payments, delivery, email, deploy pipeline, monitoring). Treat this document as the gating checklist; [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md) is the corresponding engineering backlog with concrete code-level actions.
