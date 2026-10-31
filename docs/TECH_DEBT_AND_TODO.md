# Tech debt and TODO backlog

Reviewed: 2026-09-29. Synthesizes [SECURITY_AUDIT](SECURITY_AUDIT.md), [FEATURES](FEATURES.md), [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md), and [PERFORMANCE_AUDIT](PERFORMANCE_AUDIT.md) into one prioritized, actionable backlog. Each item links back to its source finding; this document does not restate the evidence, only the action.

## P0 — block production use of real patient data or real commerce

1. **Remove production password-reset token disclosure.** Source: [SECURITY_AUDIT](SECURITY_AUDIT.md) S01. Action: gate `demoResetToken` behind `devToolsEnabled`, not `DEMO_MODE` alone, and add a regression test asserting production + demo-mode-on never returns a token.
2. **Eliminate shared/fallback passwords for staff and employee creation.** Source: [SECURITY_AUDIT](SECURITY_AUDIT.md) S02. Action: replace `DEMO_PASSWORD` fallback in `createStaff`/`createEmployee` with a private invite/setup-link flow; block demo account/fixture creation in production builds.

## P1 — required before handling real patient data or real commerce

### Security ([SECURITY_AUDIT](SECURITY_AUDIT.md))

3. **Fix cross-membership admin privilege leakage (S03).** Enforce that organization-portal write actions check the *selected* membership's `staffRole === ADMIN`, not the union of all the user's role permissions.
4. **Add session revocation (S04).** Introduce a token/session invalidation mechanism triggered by logout and password reset/change; decide token storage (localStorage vs. httpOnly cookie) alongside this.
5. **Add authentication rate limiting (S05).** Bound login/reset attempts per account and per origin; log abuse attempts.
6. **Enforce prescription fulfillment rules (S06).** Add `validUntil` and cumulative-dispensing/refill checks to `cart.service.ts`/`orders.service.ts`, transactionally.
7. **Guard destructive seed/reset paths against non-disposable targets (S07).** Require an explicit "this is disposable" confirmation (e.g. a database name allowlist or marker table) before `seed/index.ts` or `test-env.ts` truncate anything.
8. **Add log/cache privacy controls (S08).** Redact free-text query params in `request-logger.ts`; clear (not just invalidate) the TanStack Query cache on every auth-state transition, not only explicit logout.
9. **Scope clinical access and close audit gaps (S09).** Agree a least-privilege policy for consultation/prescription read access; add missing activity-log entries for organization/profile mutations.

### Code quality ([CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md))

10. **Make the lint gate functional (CQ01).** Either install/configure ESLint to match the existing strict TS conventions, or delete the dead `lint` script so it stops implying coverage that doesn't exist.
11. **Add frontend unit tests for hooks/business logic (CQ02).** Prioritize `use-cart.ts`, `use-appointments.ts`, `use-checkout`-adjacent hooks — the paths currently covered only indirectly by Playwright specs.

### Performance ([PERFORMANCE_AUDIT](PERFORMANCE_AUDIT.md))

12. **Paginate `GET /admin/reviews` (PF01), `GET /favorites` (PF02), and `GET /reviews` (PF03).** Add `take`/`skip` and a response `meta` block consistent with every other list endpoint; `GET /reviews` is the highest-exposure of the three since it's public and unauthenticated-reachable.
13. **Close the same-patient overlapping-appointment race (PF05).** Either add a serializable transaction/row lock on the patient's active appointments during booking, or a database constraint analogous to the doctor-slot partial unique index.
14. **Complete route-level code splitting (PF06).** Four dashboard/report routes are lazy; split the remaining large portal groups based on bundle evidence.

### Feature gaps material to production readiness ([FEATURES](FEATURES.md))

15. **Payment gateway integration.** Current `Payment` model is a simulation only ([DATABASE_SCHEMA](DATABASE_SCHEMA.md)); no gateway, webhook, or reconciliation exists.
16. **Delivery/logistics integration.** Delivery is a fixed demo agent with manual state transitions; no GPS/logistics provider.
17. **Credential/license verification for provider onboarding.** Currently user-entered text and document metadata only, no verification step.
18. **Email/SMS/push transport.** No outbound notification channel exists beyond in-app; password reset, appointment reminders, and registration outcomes have no external delivery path.

## P2 — cleanup, hygiene, and scale-dependent items

19. **Deduplicate inline admin approval-type branching (CQ03)** in [admin.routes.ts](../apps/api/src/modules/admin/admin.routes.ts).
20. **Standardize on `PERMISSIONS.*` constants everywhere (CQ04)** — replace the raw string literals in `favorites.routes.ts`, `profile.routes.ts`, `reviews.routes.ts`.
21. **Add structured logging/error tracking (CQ05)** — replace the console-wrapper `logger.ts` with a real sink before any production deployment; see [PRODUCTION_READINESS](PRODUCTION_READINESS.md).
23. **Paginate organization-portal list/dashboard reads (PF04)** if organization staff/service counts are expected to grow beyond demo scale.
24. **Tune TanStack Query cache lifetimes for static reference data (PF07)** (`/config`, `/specialties`, `/medicine-categories`).
25. **Decide on Decimal-vs-number precision handling (CQ06)** before any real payment integration is attempted.
26. **Build a pharmacy inventory management UI/route** — the `INVENTORY_MANAGE` permission exists but is unused; see [FEATURES](FEATURES.md) and [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md).

## Explicitly out of scope for this backlog

Regulatory/compliance sufficiency, deployed infrastructure hardening (TLS, secrets management, backups), and dependency vulnerability scanning are tracked in [PRODUCTION_READINESS](PRODUCTION_READINESS.md) rather than here, since they are deployment decisions rather than code changes.
