# Project overview

Reviewed: 2026-09-29. Evidence is the current working tree, including local edits. Start with [HANDOFF](HANDOFF.md) for a condensed continuation guide.

## Product and users

CareBridge is a healthcare marketplace demo implemented as a TypeScript pnpm monorepo. It has a React browser application, an Express API, PostgreSQL persistence through Prisma, and shared contracts and permissions. The root package explicitly identifies the project as a demo. Clinical content is entered by doctors; no diagnosis or prescription generation engine is implemented.

The main journeys are:

1. Patient finds a doctor, books an available slot, and follows appointment status.
2. Doctor opens a consultation, enters notes and a prescription, and issues it to the patient.
3. Patient selects a pharmacy, builds a cart, checks out, and follows pharmacy processing and simulated delivery.
4. Clinic/hospital staff manage their organization, doctors, schedules, patients, services, and reports.
5. Platform staff review registrations and reviews, inspect transactions, manage entities and employees, and view activity.

Additional surfaces include lab booking, health record metadata, addresses, favorites, notifications, public search, and patient profiles. [FEATURES](FEATURES.md) separates implemented demo behavior from partial and absent functionality.

## Actors and boundaries

The 11 roles are `PATIENT`, `DOCTOR`, `CLINIC_ADMIN`, `CLINIC_STAFF`, `HOSPITAL_ADMIN`, `HOSPITAL_STAFF`, `PHARMACY_ADMIN`, `PHARMACY_STAFF`, `PLATFORM_EMPLOYEE`, `PLATFORM_ADMIN`, and `SUPER_ADMIN`. Users can hold multiple roles and organization memberships. Permissions come from the shared TypeScript matrix, even though permission tables also exist.

Clinics, hospitals, and pharmacies share organization tables and one database. Tenant isolation is enforced in application code; no row-level security policy appears in the migrations. Individual services impose additional ownership/membership restrictions.

The demo uses INR and India Standard Time. Distances are stored mock values. Payments/refunds are database simulations. Delivery agents are simulated. Uploads store metadata, and lab reports are seeded placeholders. No live video, payment gateway, delivery provider, email sender, or SMS sender was found.

## Review scope and evidence

- Inspected entry points, routers, validators, domain services, shared contracts, schema/migrations, browser pages/hooks/client, fixtures, test sources, manifests and configuration. [FILE_MAP](FILE_MAP.md) inventories authored files.
- Existing plans and `Master-prompt.txt` describe intent; they are not proof of implementation. Older demo/test documents are historical context, not a fresh passing test run.
- Static findings are identified as such. An absent integration means none was found in this repository. Out-of-repository infrastructure is **unverified**.
- Deployment topology, live database contents, clinical suitability, regulatory compliance, and production capacity are **unverified**.
- Environment variable names are documented without values. Credentials and example secret values are omitted.

## Entry points

| Area | Source |
| --- | --- |
| Workspace | [package.json](../package.json), [pnpm-workspace.yaml](../pnpm-workspace.yaml) |
| API startup/middleware | [server.ts](../apps/api/src/server.ts), [app.ts](../apps/api/src/app.ts) |
| API registration | [routes/index.ts](../apps/api/src/routes/index.ts) |
| Browser routes | [router.tsx](../apps/web/src/routes/router.tsx) |
| Database | [schema.prisma](../apps/api/prisma/schema.prisma), [migrations](../apps/api/prisma/migrations) |
| Authorization | [permissions.ts](../packages/shared/src/permissions.ts), [auth-context.service.ts](../apps/api/src/services/auth-context.service.ts) |
| Destructive fixtures | [seed/index.ts](../apps/api/src/demo/seed/index.ts) |

## Assessment

The repository has a substantial implemented demo and meaningful authorization/transaction tests. It is not ready for real patient data or live commerce. Priorities are production gating of demo capabilities, removal of shared password fallbacks, tenant-specific authorization, session lifecycle, prescription fulfillment rules, and concurrency/history guarantees. See [SECURITY_AUDIT](SECURITY_AUDIT.md), [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md), and [PRODUCTION_READINESS](PRODUCTION_READINESS.md).
