# File map

Reviewed: 2026-10-31. Navigable inventory of the repository, not an exhaustive file listing. Cites the specific files already referenced across the other docs.

## Top level

```
carebridge/
├── apps/
│   ├── api/        Express + Prisma + PostgreSQL backend
│   └── web/        React SPA
├── packages/
│   └── shared/     RBAC matrix, permission constants, API contract types
├── docs/           This documentation set (plus older historical docs — see below)
├── package.json    Workspace root scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json   Shared strict TypeScript config
└── README.md
```

## apps/api/src

```
apps/api/src/
├── app.ts                Express app: Helmet, CORS, JSON parser, logging, routes, error handler
├── server.ts             HTTP server bootstrap, graceful shutdown
├── config/
│   ├── env.ts             Zod-validated environment schema (see ENVIRONMENT_AND_SETUP)
│   └── prisma.ts           Prisma client singleton
├── middleware/
│   ├── auth.ts             JWT verification, requirePermission/optionalAuth
│   ├── error.ts            Centralized error handler + Prisma error mapping
│   └── request-logger.ts   Request ID + request logging
├── routes/
│   └── index.ts            All /api/v1 router registrations (see API_REFERENCE)
├── services/                Cross-module shared services
│   ├── activity-log.service.ts
│   ├── auth-context.service.ts   Loads user/roles/permissions per request
│   ├── availability.service.ts
│   ├── document.service.ts
│   ├── notification.service.ts
│   └── tenant.service.ts
├── modules/                  20 domain modules, each routes/schemas/service (see CONVENTIONS)
│   ├── admin/            Platform admin: approvals, employees, reports, settings
│   ├── appointments/     Booking, cancel, reschedule, status
│   ├── auth/              Register, login, logout, password reset
│   ├── cart/              Single-pharmacy cart
│   ├── consultations/    Doctor consultation workspace
│   ├── deliveries/       Simulated delivery status
│   ├── demo/             Demo status/accounts/reset endpoints
│   ├── doctors/           Public catalogue + doctor-me self-service
│   ├── favorites/
│   ├── labs/              Lab tests, lab bookings, health records (3 routers)
│   ├── medicines/         Public medicine catalogue
│   ├── notifications/
│   ├── onboarding/       Public doctor/organization registration
│   ├── orders/            Checkout, order lifecycle, delivery assignment
│   ├── organizations/    Public directory + organization-me self-service
│   ├── payments/          Simulated payment records
│   ├── pharmacies/       Pharmacy discovery (organizations filtered by type)
│   ├── prescriptions/
│   ├── profile/           Patient profile and addresses
│   ├── reference/         /config, /specialties, /medicine-categories
│   ├── reviews/
│   └── search/
├── demo/seed/              Destructive fixture seeding (see SECURITY_AUDIT S07)
├── types/
│   ├── auth.ts             AuthContext type
│   └── express.d.ts        Express Request augmentation
└── utils/
    ├── age.ts, slug.ts, sequence.ts, time.ts   Domain helpers
    ├── errors.ts            AppError + factory helpers
    ├── http.ts              ok/created/paginated/parse/pagination helpers
    ├── logger.ts            Console-based logger
    └── query.ts             Shared query-parsing helpers (search text, booleans)
```

`apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/` hold the database schema (see [DATABASE_SCHEMA](DATABASE_SCHEMA.md)). `apps/api/tests/` holds the Vitest/Supertest suite (see [CONVENTIONS](CONVENTIONS.md)).

## apps/web/src

```
apps/web/src/
├── app.tsx, main.tsx        App bootstrap
├── routes/
│   └── router.tsx            createBrowserRouter tree; selected dashboard/report routes are lazy
├── layouts/                  Per-portal shells: public, doctor, organization, pharmacy, admin
├── pages/                    One folder per portal/domain, mirrors apps/api/src/modules boundaries
│   ├── admin/, appointments/, auth/, cart/, doctor/, doctors/, health-records/,
│   │   home/, labs/, medicines/, orders/, organization/, organizations/,
│   │   pharmacies/, prescriptions/, profile/
│   └── favorites-page.tsx, coming-soon-page.tsx, not-found-page.tsx, static-page.tsx
├── components/                Shared UI (cards, badges, pickers) + components/ui (primitives) + components/layout
├── hooks/                     One use-<area>.ts per domain, wraps api/<area>.ts with TanStack Query
├── api/                       Fetch client wrappers per domain + client.ts (fetch wrapper), query-client.ts
├── store/
│   └── auth-store.ts          Zustand persisted auth state (see SECURITY_AUDIT S04)
├── lib/                       Cross-cutting helpers: label maps, portal-navigation, auth-schemas, utils
├── config/
│   └── env.ts                 VITE_API_URL only
└── data/demo/                 Static demo/reference data bundled with the SPA
```

`apps/web/e2e/` holds Playwright specs (golden-flow, engagement, manual-regressions, demo-verification). `apps/web/playwright.config.ts` configures the runner.

## packages/shared/src

```
packages/shared/src/
├── index.ts             Re-exports
├── roles.ts             RoleName union / role metadata
├── permissions.ts       PERMISSIONS constants + ROLE_PERMISSIONS matrix (see DECISIONS_LOG D01)
├── statuses.ts           Shared status enums/labels
├── api.ts                Generic API envelope/pagination types
├── appointments.ts, cart.ts, orders.ts, labs.ts, clinical.ts, catalog.ts,
│   doctor-portal.ts, organization-portal.ts, profile.ts, admin.ts   Per-domain contract types
└── demo.ts               DEMO_ACCOUNTS, DEMO_DISCLAIMER constants
```

## docs/

`PRESENTATION_GUIDE.md` is the learning and demo entry point. `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `FEATURES.md`, `TECH_STACK.md`, `DATABASE_SCHEMA.md`, `API_REFERENCE.md`, and `RBAC.md` are current technical references. `DEMO_GUIDE.md`, `TESTING.md`, and `DEMO_VERIFICATION.md` are current operational references. Audit/backlog documents describe known limitations; `IMPLEMENTATION_PLAN.md` is historical planning context.
