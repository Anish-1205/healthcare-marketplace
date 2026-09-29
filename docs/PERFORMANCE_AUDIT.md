# Performance audit

Reviewed: 2026-09-29. Static review of query patterns and frontend bundling; no load testing or query-plan (`EXPLAIN`) execution was performed. Severity follows the P0/P1/P2 convention used in [SECURITY_AUDIT](SECURITY_AUDIT.md).

## Missing pagination (confirmed by reading the services)

Most list endpoints correctly paginate via `paginated()`/`toSkipTake()` ([http.ts](../apps/api/src/utils/http.ts)) — confirmed across [admin.service.ts](../apps/api/src/modules/admin/admin.service.ts) list functions, `doctors`, `organizations`, `medicines`, `lab-tests`, `orders`, `appointments`, `notifications`. The following do **not** paginate and return the full result set:

### PF01 — P1: `GET /admin/reviews` loads the entire reviews table

[admin.service.ts](../apps/api/src/modules/admin/admin.service.ts) line ~20: `listReviews()` calls `prisma.review.findMany({ orderBy: { createdAt: 'desc' }, include: {...} })` with no `where`, no `take`. Every review ever submitted (moderation queue) is loaded and sent to the client on every admin page load. Registered at `GET /admin/reviews` — see [API_REFERENCE](API_REFERENCE.md).

### PF02 — P1: `GET /favorites` loads a patient's entire favorites list unbounded

[favorites.service.ts](../apps/api/src/modules/favorites/favorites.service.ts) line 8: `listFavorites` has no `take`/`skip`. Bounded in practice by one patient's realistic favorite count, but still an unbounded query with no defensive limit — a scripted/abusive client could inflate this table and slow every subsequent load for that user.

### PF03 — P1: `GET /reviews` (public listing) is confirmed unbounded

[reviews.service.ts](../apps/api/src/modules/reviews/reviews.service.ts) `listReviews()`: `prisma.review.findMany({ where, select, orderBy })` has no `take`/`skip` at all — confirmed by direct read, not inferred. Every approved review for a target (or every review by a patient, when `?mine=true`) is returned in one response. This is a public, unauthenticated-reachable endpoint (`optionalAuth` — see [API_REFERENCE](API_REFERENCE.md)), making it the most exposed of the unbounded-list findings. Matches [FEATURES](FEATURES.md)'s "lists unbounded" note for reviews.

### PF04 — P2: several organization-portal reads have no pagination

[organization-me.service.ts](../apps/api/src/modules/organizations/organization-me.service.ts) — `listDoctors`, `listStaff`, `listServices`, `listSchedules`, dashboard aggregation queries (lines ~77, 111, 161, 194) all use unbounded `findMany`. Acceptable at demo scale (one organization's own doctors/staff/services, realistically small), but there is no upper bound if a large hospital's staff roster grows.

## Appointment slot concurrency (recap, detail in DATABASE_SCHEMA)

### PF05 — P1: patient double-booking race is not closed by any constraint

Per [ARCHITECTURE](ARCHITECTURE.md) and confirmed in [DATABASE_SCHEMA](DATABASE_SCHEMA.md): the partial unique index `appointments_doctor_slot_active_key` only prevents two bookings for the **same doctor** at the same `scheduledStart`. It does not prevent the same **patient** from booking overlapping appointments with two different doctors — that check is a plain read inside the booking transaction, not protected by a lock or constraint. Under concurrent requests this is a genuine TOCTOU race. Runtime reproduction is **unverified**; the gap is structural, visible in code.

## Prisma include/select patterns

- Admin list endpoints generally use targeted `select` objects (e.g. `appointmentSelect`, `orderSelect` in [admin.service.ts](../apps/api/src/modules/admin/admin.service.ts)) rather than blanket `include`, which is good practice for payload size.
- Several dashboard/report aggregation functions in [organization-me.service.ts](../apps/api/src/modules/organizations/organization-me.service.ts) and [admin.service.ts](../apps/api/src/modules/admin/admin.service.ts) run 3–6 independent `findMany` calls via `Promise.all` or sequential `await` rather than a single aggregated query (e.g. `getDashboard`, `getOverview`). This is N "medium" queries rather than N+1 "one query per row", so it is not the classic N+1 pattern, but each dashboard load does issue multiple round trips to Postgres. **P2** — acceptable at demo data volumes; revisit if dashboard load time becomes visible at scale.
- No obvious N+1-per-row pattern (a `findMany` followed by a query inside a `.map()`) was found in the modules inspected. If one exists elsewhere in the 20 modules, it was not located by this review — **unverified** as exhaustive.

## Indexes

Cross-checked against [DATABASE_SCHEMA](DATABASE_SCHEMA.md): the high-traffic filter columns (`Appointment.doctorId/scheduledStart`, `Order.pharmacyId/status/placedAt`, `Notification.userId/isRead/createdAt`, `Doctor.approvalStatus/isActive`) all have supporting indexes. No obviously missing index was found for the query shapes actually used in the service layer. A full query-plan audit against production-scale data is **unverified**.

## Frontend

### PF06 — P1: no route-level code splitting

[router.tsx](../apps/web/src/routes/router.tsx) statically imports every page component (confirmed: zero occurrences of `lazy(` in the file). All portals — patient, doctor, organization, pharmacy, platform admin — ship in the same JS bundle regardless of which the visiting user actually needs. For a multi-portal app this materially inflates initial bundle size and first-load time. **Recommendation:** convert page imports to `React.lazy` + route-level `Suspense` boundaries, at minimum splitting by portal (patient/doctor/organization/pharmacy/admin).

### PF07 — P2: TanStack Query defaults are conservative but untuned per-query

[ARCHITECTURE](ARCHITECTURE.md) notes a 30-second default stale time and limited retries globally via [query-client.ts](../apps/web/src/api/query-client.ts). No per-query `staleTime`/`gcTime` overrides were found for clearly-static data (e.g. `/specialties`, `/medicine-categories`, `/config` reference endpoints), which could safely cache far longer than 30 seconds. Minor; not a correctness issue.

## Summary table

| ID | Severity | Issue |
| --- | --- | --- |
| PF01 | P1 | `GET /admin/reviews` unbounded `findMany` |
| PF02 | P1 | `GET /favorites` unbounded `findMany` |
| PF05 | P1 | No constraint/lock closes the same-patient overlapping-appointment race |
| PF06 | P1 | No route-level code splitting in `router.tsx`; full app ships in one bundle |
| PF03 | P1 | `GET /reviews` (public, unauthenticated-reachable) is confirmed unbounded |
| PF04 | P2 | Organization-portal list/dashboard reads unbounded (acceptable at current scale) |
| PF07 | P2 | No per-query cache tuning for static reference data |

See [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md) for prioritization alongside security and code-quality findings.
