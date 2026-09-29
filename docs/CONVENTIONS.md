# Conventions

Reviewed: 2026-09-29. Conventions observed directly in the code, not prescribed. Where a convention is broken, the exception is noted (see also [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md)).

## Module folder structure (apps/api/src/modules/*)

Every domain module (e.g. [appointments](../apps/api/src/modules/appointments), [cart](../apps/api/src/modules/cart), [orders](../apps/api/src/modules/orders)) follows a consistent 3-file shape:

- `<module>.routes.ts` — Express router: middleware wiring, permission checks, calls into the service, wraps responses with `ok`/`created`/`paginated` from [http.ts](../apps/api/src/utils/http.ts).
- `<module>.schemas.ts` — Zod schemas for request bodies/queries/params.
- `<module>.service.ts` — business logic, Prisma queries/transactions, ownership/tenant checks.

Modules with a self-service "me" sub-resource (doctors, organizations) split further into `<module>-me.routes.ts` / `.schemas.ts` / `.service.ts`, mounted under `/me` ahead of the public `/:id` catch-all — see [doctors.routes.ts](../apps/api/src/modules/doctors/doctors.routes.ts) and [organizations.routes.ts](../apps/api/src/modules/organizations/organizations.routes.ts) for the explicit ordering comment explaining why.

## Naming

- UUID primary keys named `id`; foreign keys named `<entity>Id` (e.g. `patientId`, `doctorId`, `organizationId`) — [schema.prisma](../apps/api/prisma/schema.prisma).
- Database tables are snake_case plural via `@@map`; Prisma model names are PascalCase singular.
- Human-readable business identifiers use a `<PREFIX>-<YEAR>-<SEQ>` shape (e.g. `RX-2026-00125`, `ORD-2026-0042`) generated from `SequenceCounter` rows — see [DATABASE_SCHEMA](DATABASE_SCHEMA.md).
- Permission keys are `dot.separated.lowercase` strings (e.g. `appointment.book`, `organization.staff.manage`), defined once as `SCREAMING_SNAKE_CASE` constants in [permissions.ts](../packages/shared/src/permissions.ts) and consumed as `PERMISSIONS.APPOINTMENT_BOOK`. A handful of routes bypass the constant and inline the raw string (see [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md) CQ04) — that is a deviation, not the convention.
- React pages live under `apps/web/src/pages/<area>/<name>-page.tsx`; hooks under `apps/web/src/hooks/use-<area>.ts`; API client wrappers under `apps/web/src/api/<area>.ts` — one file per domain, mirroring the backend module boundary.

## Validation

Zod is the single validation layer on both sides: request schemas in every `*.schemas.ts` on the API, and form schemas paired with React Hook Form (`@hookform/resolvers/zod`) on the web. The API's `parse()` helper ([http.ts](../apps/api/src/utils/http.ts)) is the only way route handlers read `req.body`/`req.query`/`req.params` — it throws a `VALIDATION_ERROR` `AppError` on failure, keeping validation-to-error-response mapping in one place.

## Error handling

- All thrown domain errors are `AppError` instances (or its factory helpers `badRequest`/`unauthorized`/`forbidden`/`notFound`/`conflict`) from [errors.ts](../apps/api/src/utils/errors.ts) — never bare `Error` or ad hoc status codes in route/service code.
- Route handlers are `async (req, res) => ...` with no manual `try/catch`; Express 5's native promise-rejection forwarding routes thrown errors to [error.ts](../apps/api/src/middleware/error.ts).
- Known Prisma error codes (`P2002`, `P2003`, `P2025`) are translated to domain-appropriate `AppError`s centrally, not per-call-site.

## Authorization pattern

Two layers, consistently applied:

1. **Route-level permission gate**: `requirePermission(...)` on the router, checking the union of the caller's role permissions (from [permissions.ts](../packages/shared/src/permissions.ts)). Supplying multiple permissions is OR, not AND — used where several role types can reach the same endpoint (e.g. patient/doctor/organization all reading appointments with different permissions).
2. **Service-level ownership/tenant check**: inside the service function, using the `AuthContext` (`getAuth(req)`) to verify the record actually belongs to/is visible to the caller. Route comments explicitly flag this split (e.g. "Ownership ... is enforced in the service layer" in [appointments.routes.ts](../apps/api/src/modules/appointments/appointments.routes.ts), [prescriptions.routes.ts](../apps/api/src/modules/prescriptions/prescriptions.routes.ts), [consultations.routes.ts](../apps/api/src/modules/consultations/consultations.routes.ts)).

Organization self-service routes add a third layer: a `?organizationId=` query param resolved by a small `selectedOrganization()` helper, since a staff user may belong to more than one organization — see [organization-me.routes.ts](../apps/api/src/modules/organizations/organization-me.routes.ts) and the cross-membership gap this creates ([SECURITY_AUDIT](SECURITY_AUDIT.md) S03).

## Pagination

Uniform pattern: a query schema extending `paginationQuery` (`page`, `pageSize`, capped at `MAX_PAGE_SIZE`), `toSkipTake()` to convert to Prisma `skip`/`take`, and `paginated(res, data, page, pageSize, total)` to shape the response envelope with a `meta` block — [http.ts](../apps/api/src/utils/http.ts). Endpoints that skip this pattern are tracked as findings, not alternate conventions — see [PERFORMANCE_AUDIT](PERFORMANCE_AUDIT.md) PF01–PF04.

## History/audit tables

Status-change history follows one repeated shape across `AppointmentStatusHistory`, `OrderStatusHistory`, `DeliveryStatusHistory`: `fromStatus` (nullable), `toStatus`, optional `note`, optional `changedById`/actor reference, `createdAt`. New status-bearing entities should follow this shape for consistency — see [DATABASE_SCHEMA](DATABASE_SCHEMA.md).

## Money and dates

Money is always `Decimal(10,2)` at rest; conversion to JS `number` happens at the DTO/response boundary, not in the database layer. Scheduling logic is IST-aware via a dedicated `utils/time.ts` (`PLATFORM_TIMEZONE`); appointment/lab dates mix `DateTime` (timestamps) and `@db.Date` (date-only) fields deliberately depending on whether time-of-day matters for that field.

## Snapshotting mutable data

Order rows snapshot the delivery address and item prices/names at checkout time so later catalogue or address edits don't rewrite history ([DATABASE_SCHEMA](DATABASE_SCHEMA.md) `Order`/`OrderItem`). This convention is **not** applied to `LabBooking.address` (a live FK, not a snapshot) — a known inconsistency, not an intended second convention; see [FEATURES](FEATURES.md).

## Testing

- API: Vitest + Supertest, one test file per concern under [apps/api/tests](../apps/api/tests), including explicit negative-authorization tests (asserting a role *cannot* perform an action).
- Web: Vitest for the few existing unit tests, Playwright for end-to-end specs under [apps/web/e2e](../apps/web/e2e) exercising full user journeys across portals.
- Test environment setup is centralized in [test-env.ts](../apps/api/tests/test-env.ts) (API) and [environment.ts](../apps/web/e2e/environment.ts) (Playwright).

## Commit messages

`git log` shows short imperative-mood subject lines, frequently prefixed with a phase marker during initial development (`Phase 16: implement patient reviews, moderation and favorites`, `Phase 19: document setup, architecture, API, and demos`) alongside plain imperative fixes (`Fix seeded organization profile saves`). No enforced conventional-commits format (no `feat:`/`fix:` prefixes) was found. Recent/ongoing work has moved away from phase prefixes toward plain descriptive subjects.
