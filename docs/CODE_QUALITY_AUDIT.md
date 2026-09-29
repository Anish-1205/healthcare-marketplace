# Code quality audit

Reviewed: 2026-09-29. Static review only; no runtime profiling. Severity follows [SECURITY_AUDIT](SECURITY_AUDIT.md)'s P0/P1/P2 convention: P0 blocks production, P1 should be fixed before real use, P2 is cleanup/hygiene.

## Toolchain results (actually run this session)

- `pnpm -w typecheck` (`tsc --noEmit` across `packages/shared`, `apps/api`, `apps/web`, plus `apps/web`'s separate `tsconfig.e2e.json`) — **passes with zero errors** on the current working tree.
- `pnpm --filter @carebridge/web lint` — **fails**: `eslint` is invoked in [apps/web/package.json](../apps/web/package.json) `lint` script but `eslint` is not installed (not in any `package.json` devDependencies) and no ESLint config file (`.eslintrc*`, `eslint.config.*`) exists anywhere in the repository. The lint script cannot run at all. No lint step exists for `apps/api` or `packages/shared` (no `lint` script defined).

### CQ01 — P1: lint is configured but non-functional

The web `lint` script (`eslint src`) fails immediately with "'eslint' is not recognized" because the package isn't installed. There is no working static-analysis gate beyond `tsc --noEmit` anywhere in the monorepo. Source: [apps/web/package.json](../apps/web/package.json).

**Recommendation:** either install and configure ESLint (with a config matching the strict TS/Zod/React conventions already followed) or remove the dead script so CI doesn't give a false sense of coverage.

## Type safety

- **Strict mode is on.** [tsconfig.base.json](../tsconfig.base.json) sets `strict: true`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, and all three workspace configs extend it.
- **No `any` usage found.** A grep for `: any`, `<any>`, `as any` across `apps/api/src` and `apps/web/src` returned zero matches.
- **No `@ts-ignore`/`@ts-expect-error` suppressions found** in either app.
- One `as unknown as` type-widening cast, in [apps/api/src/config/prisma.ts](../apps/api/src/config/prisma.ts) — not inspected further; likely a Prisma client extension/mock pattern. **unverified** whether it is load-bearing or a smell.

This is a genuinely clean baseline relative to typical demo codebases — see CQ01 above for the caveat that nothing enforces it going forward besides `tsc`.

## Error handling

- Centralized: [errors.ts](../apps/api/src/utils/errors.ts) defines a single `AppError` class with status/code/message/details, plus factory helpers (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`).
- Centralized handler: [error.ts](../apps/api/src/middleware/error.ts) maps `AppError`, known Prisma errors (`P2002`→409 duplicate, `P2003`→400 invalid reference, `P2025`→404), and JSON parse errors to a consistent envelope; unexpected errors are logged and returned as a generic 500 in all environments, with a `debug` field added only outside production.
- **P2 — inconsistent request-scoped error surface:** the `debug` field on 500s is a reasonable production/dev split, but there is no structured error-tracking sink (e.g. Sentry) — errors go to `logger.error`, which is a `console.error` wrapper ([logger.ts](../apps/api/src/utils/logger.ts)). No log aggregation is configured. See [PRODUCTION_READINESS](PRODUCTION_READINESS.md).
- Route handlers consistently use `async (req, res) => ok(res, await service.fn(...))` with no manual try/catch — relies on Express 5's native async-rejection-to-error-middleware forwarding. This is a real Express 5 feature (unlike Express 4), so the pattern is sound, not a bug.

## Duplication and inconsistent patterns

- **P2 — repeated inline route bodies:** several route files (notably [admin.routes.ts](../apps/api/src/modules/admin/admin.routes.ts)) inline non-trivial logic directly in the router registration (e.g. the `type === 'doctor' ? ... : type === 'organization' ? ... : null` approval-type resolution appears twice, once for approve and once for reject). A small helper would remove the duplication.
- **P2 — two permission-string styles:** most modules import `PERMISSIONS.X` constants from `@carebridge/shared` ([permissions.ts](../packages/shared/src/permissions.ts)), but [favorites.routes.ts](../apps/api/src/modules/favorites/favorites.routes.ts), [profile.routes.ts](../apps/api/src/modules/profile/profile.routes.ts), and [reviews.routes.ts](../apps/api/src/modules/reviews/reviews.routes.ts) call `requirePermission('favorite.manage')`, `requirePermission('patient.profile.manage')`, `requirePermission('review.create')` with raw string literals instead of the shared constants. Functionally identical (the constants are the same strings) but bypasses the type-checked single source of truth — a typo here would silently create an unreachable permission rather than a compile error.
- **P2 — history-table shape duplicated three times:** `AppointmentStatusHistory`, `OrderStatusHistory`, `DeliveryStatusHistory` in [schema.prisma](../apps/api/prisma/schema.prisma) share an identical `fromStatus`/`toStatus`/`note`/`changedBy`/`createdAt` shape with no shared base — normal for Prisma (no model inheritance), not a real fix candidate, but worth knowing when adding a fourth.

## Dead code / unused surface

- No `pharmacy inventory management` router/page exists despite the `INVENTORY_MANAGE` permission being defined in [permissions.ts](../packages/shared/src/permissions.ts) — the permission is unused by any route (read/decrement/restore happen internally in order services, not via a dedicated management endpoint). See [FEATURES](FEATURES.md) "Pharmacy inventory/catalog management — Missing".
- No further dead-code sweep (unused exports, unreachable branches) was run; a bundler/tree-shake report was not generated. **unverified** beyond the specific case above.

## Test coverage

- API: 22 test files under [apps/api/tests](../apps/api/tests) — includes negative authorization tests per [SECURITY_AUDIT](SECURITY_AUDIT.md). Total ~2,910 lines.
- Web: only 2 test files under `apps/web/src` (~179 lines) plus [router.test.tsx](../apps/web/src/routes/router.test.tsx) — component/hook-level unit coverage is thin; most web verification relies on the 5 Playwright specs under [apps/web/e2e](../apps/web/e2e).
- **P1 — front-end unit coverage gap:** business logic in hooks (`use-cart.ts`, `use-appointments.ts`, etc. under [apps/web/src/hooks](../apps/web/src/hooks)) has no dedicated unit tests found. Coverage relies on e2e specs exercising the same code paths indirectly; a hook regression not covered by an e2e scenario would go undetected.
- Whether tests currently pass against a live database was not verified in this session (would require running `pnpm -r test` against a disposable Postgres instance, which was out of scope for a read-only review).

## Money and numeric handling

- Prisma stores money as `Decimal(10,2)`; DTOs and route responses commonly convert to JS `number` (confirmed pattern noted in [ARCHITECTURE](ARCHITECTURE.md)). This is a **P2** precision concern for a real payment system (floating-point rounding at the JSON boundary) but is consistent with the "simulated payments" design — see [DECISIONS_LOG](DECISIONS_LOG.md). Flag for re-evaluation if real payment integration is ever added.

## Summary table

| ID | Severity | Issue |
| --- | --- | --- |
| CQ01 | P1 | `lint` script references an uninstalled, unconfigured ESLint — no working static-analysis gate |
| CQ02 | P1 | Front-end hooks/business logic have negligible unit test coverage; rely on e2e only |
| CQ03 | P2 | Inline duplicated approval-type branching in admin routes |
| CQ04 | P2 | Mixed use of `PERMISSIONS.*` constants vs. raw permission string literals |
| CQ05 | P2 | No structured error/log aggregation sink; `logger.ts` is a console wrapper |
| CQ06 | P2 | Decimal-to-number conversion at API boundary risks precision loss if real payments are added |

See [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md) for how these roll into the prioritized backlog.
