# Decisions log

Reviewed: 2026-09-29. No ADR folder or decision-record files exist in this repository (checked for `docs/decisions`, `*ADR*`, and found none). Every entry below is **inferred from code and schema structure**, not from any written decision record, meeting note, or comment explicitly labeled as a decision. Confidence is stated per entry.

## D01 — Permissions are a shared TypeScript matrix, not a DB-driven RBAC system

**Inferred from**: [permissions.ts](../packages/shared/src/permissions.ts) defines `PERMISSIONS` constants and a `ROLE_PERMISSIONS` matrix, described in its own comment as "the single source of truth"; the API authorizes directly against it via `permissionsForRoles` ([auth-context.service.ts](../apps/api/src/services/auth-context.service.ts)), not by querying the `RolePermission` table at request time. The `Role`/`Permission`/`RolePermission` tables exist in [schema.prisma](../apps/api/prisma/schema.prisma) and are populated by the seed, but only to let the admin portal *display* the matrix, not to *enforce* it.

**Likely reasoning**: a compile-time-checked TypeScript matrix catches typos and gives IDE autocomplete; a DB-driven matrix would require a query per permission check and admin UI to safely edit it. For a fixed set of 11 roles in a demo, the simpler static approach wins.

**Trade-off accepted**: changing a role's permissions requires a code deploy, not an admin action — acceptable for a demo, likely wrong for a real multi-tenant SaaS where operators expect to tune roles themselves.

**Confidence**: high — directly stated in code comments.

## D02 — Single-pharmacy-per-cart constraint

**Inferred from**: `Cart` has a single nullable `pharmacyId` ([schema.prisma](../apps/api/prisma/schema.prisma)), and the schema comment states "bound to one pharmacy (prices are pharmacy-specific)".

**Likely reasoning**: `PharmacyInventory` prices/stock are per-pharmacy, and a combined checkout across multiple pharmacies would require splitting one order into several with independent statuses, delivery, and payment — meaningfully more complex for a demo scope.

**Trade-off accepted**: a patient cannot combine medicines from two pharmacies in one order; must check out separately, or the cart must be cleared/reassigned when switching pharmacies (see `buildCartFromPrescription` in [cart.service.ts](../apps/api/src/modules/cart/cart.service.ts)).

**Confidence**: high — the schema comment is explicit.

## D03 — Payments, delivery, and video consultation are simulated, not integrated

**Inferred from**: `Payment` model comment: "Simulated payment record. No real gateway is involved."; `Delivery` model comment: "Simulated delivery. No logistics provider is integrated." ([schema.prisma](../apps/api/prisma/schema.prisma)). `ConsultationType` includes `VIDEO`/`PHONE` as metadata only, with no media/calling integration found ([FEATURES](FEATURES.md)). README explicitly states "Payments, delivery, video consultation and messaging are simulated."

**Likely reasoning**: a demo marketplace needs to show the full booking→consultation→prescription→order→delivery journey without the cost/complexity of real payment processor accounts, courier APIs, or WebRTC infrastructure.

**Trade-off accepted**: none of these subsystems can go live without material rework — this is the single largest gap between demo and production, consolidated in [PRODUCTION_READINESS](PRODUCTION_READINESS.md).

**Confidence**: high — stated directly in schema comments and the README.

## D04 — Demo seed truncates and rebuilds all application tables

**Inferred from**: [seed/index.ts](../apps/api/src/demo/seed/index.ts) truncates all non-migration tables in the target schema before inserting fixtures (per [ARCHITECTURE](ARCHITECTURE.md)); `db:seed:ready`/`db:seed:complete` scripts exist for two named scenario states; the HTTP `/demo/reset` endpoint invalidates all sessions.

**Likely reasoning**: deterministic, reproducible demo scenarios matter more than incremental/idempotent seeding for a sales-demo-oriented product; a full reset guarantees a known state for scripted walkthroughs (e.g. Playwright specs, live demos).

**Trade-off accepted**: the CLI seed path has no built-in guard against running against a non-disposable database ([SECURITY_AUDIT](SECURITY_AUDIT.md) S07) — the design assumes the operator always points it at a throwaway database, which is not enforced.

**Confidence**: high for the mechanism, medium for "why" (business/demo-workflow reasoning is plausible but not stated anywhere in code).

## D05 — Organizations (clinics, hospitals, pharmacies) share one table and one tenant model

**Inferred from**: a single `Organization` model with an `OrganizationType` discriminator and type-specific optional columns coexisting (hospital vs. pharmacy fields) rather than three separate tables or a class-table-inheritance pattern ([schema.prisma](../apps/api/prisma/schema.prisma)).

**Likely reasoning**: clinics, hospitals, and pharmacies share most fields (address, staff, approval workflow, reviews, ratings) — a shared table avoids duplicating that machinery three times, at the cost of some always-null columns per row.

**Trade-off accepted**: no row-level security or per-type table constraint separates the tenants at the database level; isolation is entirely in application code ([ARCHITECTURE](ARCHITECTURE.md)).

**Confidence**: medium — plausible from the schema shape, but the "why not three tables" reasoning is not stated anywhere.

## D06 — Orders snapshot address and pricing; lab bookings do not

**Inferred from**: `Order` stores `deliveryRecipient`/`deliveryLine1`/etc. as copied fields alongside a nullable `addressId` FK, while `LabBooking.addressId` is a live FK with no snapshot fields ([schema.prisma](../apps/api/prisma/schema.prisma)).

**Likely reasoning**: orders were built with historical-accuracy in mind (an order must always reflect what was actually charged/delivered); lab bookings were added later as a "secondary demo feature" (per the schema section comment) without the same rigor applied.

**Trade-off accepted**: this is flagged as an inconsistency in [FEATURES](FEATURES.md), not a considered design choice for labs specifically — most likely an oversight rather than an intentional decision, but the effect either way is documented here so it isn't missed.

**Confidence**: medium — the order behavior is clearly intentional (comment says so); the lab-booking gap is more likely an omission than a decision, included here for completeness per the task's request to catalogue inferred decisions.

## D07 — The doctor-slot collision guard is a database constraint, not application logic alone

**Inferred from**: migration [20260923000000_appointment_slot_guard](../apps/api/prisma/migrations/20260923000000_appointment_slot_guard/migration.sql) adds a hand-written partial unique index with a comment: "Two patients can pass the 'is this slot free?' check at the same time; this partial unique index makes the database the final arbiter."

**Likely reasoning**: an application-level availability check has an inherent TOCTOU race under concurrency; the team recognized this and added a database-level backstop after the fact (it's a separate, later migration from the initial schema).

**Trade-off accepted**: only the doctor/slot dimension is protected this way; the analogous patient-side race (same patient, two doctors, overlapping times) was not given the same treatment — see [PERFORMANCE_AUDIT](PERFORMANCE_AUDIT.md) PF05. This suggests the team applied the fix reactively to the specific race they identified, not a general concurrency policy.

**Confidence**: high — the migration comment explains the reasoning directly.

## D08 — No ORM-level soft deletes; deletion is modeled per-relation via `onDelete` behavior

**Inferred from**: no `deletedAt`/`isDeleted` columns exist anywhere in [schema.prisma](../apps/api/prisma/schema.prisma); instead, referential integrity is handled per-relation with explicit `Restrict`/`Cascade`/`SetNull` (e.g. `Patient`→`Appointment` is `Restrict`, preventing patient deletion once they have appointment history; `Doctor`→`Prescription` is likewise `Restrict`).

**Likely reasoning**: `isActive` boolean flags (on `Doctor`, `Organization`, `Medicine`, `PharmacyInventory`, etc.) serve as the deactivation mechanism instead, while hard deletes are only permitted where no history depends on the row (`SetNull`/`Cascade` targets).

**Confidence**: medium — inferred from the consistent absence of soft-delete columns plus consistent use of `isActive` flags; not stated anywhere as an explicit choice.

## Note on decision-record process

If this project continues, consider adding actual ADR files (e.g. `docs/decisions/000N-title.md`) for future architecturally significant choices, so subsequent reviews don't have to re-derive intent from schema comments alone.
