# CareBridge

A **demo** multi-tenant healthcare marketplace. Patients can find doctors, book consultations, receive prescriptions, order medicines from the pharmacy they choose and track delivery. Clinics, hospitals, pharmacies and platform admins each get their own portal.

> **Demo only.** This is a demonstration application. Healthcare information shown here is sample data and must not be used for medical decisions. Payments, delivery, video consultation and messaging are simulated.

**Status:** Phase 20 verification passed 206 API, 25 frontend and 25 browser tests, including desktop/mobile booking-to-delivery. Full master-prompt acceptance remains open: pharmacy self-service setup is missing and Phase 17 polish is partial. See the [verification report](docs/DEMO_VERIFICATION.md) for evidence and remaining gaps.

## Stack

| Layer | Tech |
|---|---|
| API | Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL, Zod, JWT, bcrypt (`bcryptjs`) |
| Web | React 18, Vite, TypeScript, Tailwind, hand-written shadcn-style primitives, TanStack Query, React Router, React Hook Form + Zod, Zustand |
| Shared | `@carebridge/shared`: roles, permission matrix, status enums, API/catalog types, demo accounts |
| Tests | Vitest, Supertest, Playwright |

This is a pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`, `docs`.

## Prerequisites

- **Node.js 20.19+** (22 LTS recommended; developed on 24)
- **pnpm 10.31.0** (`corepack enable` or `npm i -g pnpm@10.31.0`)
- **PostgreSQL 17** (bundled Docker Compose) or a compatible local PostgreSQL installation. Start Docker Desktop/daemon before `pnpm db:up`.

## Setup

From the repository root, copy `apps/api/.env.example` to `apps/api/.env` and set a unique `JWT_SECRET` (at least 32 characters). The example uses the Docker database; replace its URL if using local PostgreSQL.

```dotenv
# Docker database (pnpm db:up). For a local install use your own credentials/port.
DATABASE_URL="postgresql://carebridge:carebridge@localhost:5433/carebridge?schema=public"
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-random-string-of-at-least-32-chars
JWT_EXPIRES_IN=12h
DEMO_MODE=true
DEMO_SCENARIO_STATE=ready     # ready | complete (see "Golden demo scenario")
```

The API requires `DATABASE_URL`. The other values shown are explicit development settings; the API refuses to start in production with its built-in JWT secret. `pnpm install` builds the shared package and generates the Prisma client.

```bash
pnpm install
pnpm db:up                   # Docker must already be running; skip for local PostgreSQL
pnpm db:deploy               # apply migrations
pnpm db:seed                 # load the ready demo scenario
pnpm dev:api                 # http://localhost:4000/api/v1  (health: /api/v1/health)
```

In a second terminal, start the web app. It proxies `/api` to `localhost:4000` in dev, so `apps/web/.env` is optional:

```bash
pnpm --filter @carebridge/web dev   # http://localhost:5173
```

| Service | Port |
|---|---|
| API | 4000 |
| Web | 5173 |
| PostgreSQL (Docker) | 5433 |

## Demo accounts

All accounts use the password **`Demo@123`**. It is for development only, and the seed stores it as a bcrypt hash.

| Role | Email | Who |
|---|---|---|
| Patient | `patient@carebridge.demo` | Rahul Verma |
| Doctor | `doctor@carebridge.demo` | Dr. Maya Rao, Dermatologist |
| Clinic admin | `clinic@carebridge.demo` | Sunrise Family Clinic |
| Hospital admin | `hospital@carebridge.demo` | Community Health Hospital |
| Pharmacy admin | `pharmacy@carebridge.demo` | City Care Pharmacy |
| Platform employee | `employee@carebridge.demo` | Provider onboarding |
| Platform admin | `admin@carebridge.demo` | Marketplace operations |
| Super admin | `superadmin@carebridge.demo` | Full access |

Other seeded logins follow the same password, for example `arjun.mehta@carebridge.demo`, `admin.medpoint@carebridge.demo`, `reception.sunrise@carebridge.demo` and `aisha.khan@patients.carebridge.demo`.

## Golden demo scenario

**Rahul Verma → Dr. Maya Rao (Sunrise Family Clinic) → prescription → City Care Pharmacy → delivery**

- `pnpm db:seed:ready` (the `pnpm db:seed` default) reserves Maya's 5:30 PM slot today if it is still in the future; otherwise choose another available slot. With an untouched seed, the next prescription and order are **RX-<current year>-00125** and **ORD-<current year>-0042**. Other writes can change those numbers.
- `pnpm db:seed:complete` pre-seeds the whole chain, from yesterday's appointment to the delivered order. It shows up in the patient, doctor, clinic, pharmacy and admin portals.

## Demo mode and resetting data

`DEMO_MODE=true` exposes demo accounts (`GET /api/v1/demo/accounts`) and enables simulated payments and delivery. Lab bookings, document metadata and password-reset tokens are also mock implementations. The reset endpoint additionally requires a non-production environment and an admin token.

Ways to reset:

- `pnpm db:seed`: truncate and reseed demo records (keeps the schema; invalidates prior demo sessions).
- `pnpm db:reset`: drop the database, re-run migrations, then seed.
- `POST /api/v1/demo/reset` with an admin token and body `{ "scenarioState": "ready" | "complete" }`. This only works when `NODE_ENV !== production`. It invalidates all sessions.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev:api` | API with hot reload |
| `pnpm build` / `pnpm typecheck` | Build or typecheck all packages |
| `pnpm test` | API integration and frontend unit tests (see below) |
| `pnpm test:e2e` | Playwright browser tests, including desktop/mobile booking-to-delivery |
| `pnpm test:demo` / `pnpm test:phase18` | Typechecks, builds, unit/integration tests, then browser tests |
| `pnpm db:migrate` | Create/apply a migration in development |
| `pnpm db:deploy` | Apply existing migrations |
| `pnpm db:seed[:ready\|:complete]` | Load demo data |
| `pnpm db:up` / `pnpm db:down` | Start/stop the Docker PostgreSQL |

### Tests

Tests migrate and reseed a **separate** database, `carebridge_test` by default. Never point `TEST_DATABASE_URL` at your demo or production database. Keep Docker running and create the test database once:

```bash
docker exec carebridge-postgres psql -U carebridge -c "CREATE DATABASE carebridge_test;"
pnpm test
```

Playwright also requires installed Microsoft Edge. The browser suite starts test servers on ports 4001 and 5174. The golden-flow test can be timing-sensitive on slow machines; rerun the failing test and inspect its saved trace before treating a timeout as an application failure. See [testing notes](docs/TESTING.md).

The suite covers login for every demo account, registration, password reset, token/deactivation handling, the RBAC matrix, tenant isolation, route authorization, seed invariants (data volumes, golden numbering, data consistency across portals), provider onboarding and approval, platform management, lab booking and health-record isolation, notifications, global search and doctor/organization/pharmacy/medicine discovery (filters, pagination, real slot availability). Critical workflow tests also cover concurrent booking, prescription creation, pharmacy checkout, delivery progression and cross-tenant delivery access. See [docs/TESTING.md](docs/TESTING.md) for coverage, browser prerequisites and the golden-flow walkthrough checklist.

## Web app

`apps/web` is a Vite + React SPA. Everything under `/` is public and shared by anonymous and signed-in patients (the homepage personalizes when you're logged in, per the demo data strategy). `/doctor/*`, `/organization/*`, `/pharmacy/*`, and `/admin/*` provide role-protected workspaces for doctors, clinics/hospitals, pharmacies, and the platform team. Patients can browse `/lab-tests`, track `/lab-bookings`, use the mock document vault at `/health-records`, save providers at `/favorites`, and read updates at `/notifications`.

- `pnpm --filter @carebridge/web dev` — dev server on 5173, proxies `/api/*` to the API on 4000
- `pnpm --filter @carebridge/web build` — typecheck + production build
- `apps/web/.env` (optional in dev): `VITE_API_URL=http://localhost:4000/api/v1`

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Database](docs/DATABASE.md) · [API](docs/API.md) · [RBAC](docs/RBAC.md)
- [Client demo guide](docs/DEMO_GUIDE.md) · [Testing](docs/TESTING.md) · [Demo verification](docs/DEMO_VERIFICATION.md) · [Production readiness](docs/PRODUCTION_READINESS.md) · [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
