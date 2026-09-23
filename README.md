# CareBridge

A **demo** multi-tenant healthcare marketplace. Patients can find doctors, book consultations, receive prescriptions, order medicines from the pharmacy they choose and track delivery. Clinics, hospitals, pharmacies and platform admins each get their own portal.

> **Demo only.** This is a demonstration application. Healthcare information shown here is sample data and must not be used for medical decisions. Payments, delivery, video consultation and messaging are simulated.

**Status:** Phases 0–13 are complete: platform foundations, patient marketplace and appointments, doctor consultations and prescriptions, pharmacy ordering and delivery, and the clinic/hospital operations portal. See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Stack

| Layer | Tech |
|---|---|
| API | Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL, Zod, JWT, bcrypt (`bcryptjs`) |
| Web | React 18, Vite, TypeScript, Tailwind, hand-written shadcn-style primitives, TanStack Query, React Router, React Hook Form + Zod, Zustand |
| Shared | `@carebridge/shared`: roles, permission matrix, status enums, API/catalog types, demo accounts |
| Tests | Vitest + Supertest |

This is a pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`, `docs`.

## Prerequisites

- **Node.js 20.19+** (22 LTS recommended; developed on 24)
- **pnpm 10** (`corepack enable` or `npm i -g pnpm`)
- **PostgreSQL 14+**, either through Docker using the bundled `docker-compose.yml`, or a local install

## Setup

```bash
pnpm install                 # also builds @carebridge/shared and generates the Prisma client
pnpm db:up                   # optional: start PostgreSQL in Docker on localhost:5433
```

Create `apps/api/.env`:

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

Only `DATABASE_URL` is required. Everything else has safe development defaults, and the API refuses to start in production with the default JWT secret.

```bash
pnpm db:deploy               # apply migrations
pnpm db:seed                 # load demo data (~1s, deterministic)
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

**Rahul Verma → Dr. Maya Rao (Sunrise Family Clinic) → RX-2026-00125 → City Care Pharmacy → ORD-2026-0042**

- `pnpm db:seed:ready` (default) sets up the live demo. Rahul has no Maya appointment yet, and Maya's 5:30 PM slot today is free. The prescription and order you create live become exactly **RX-2026-00125** and **ORD-2026-0042**.
- `pnpm db:seed:complete` pre-seeds the whole chain, from yesterday's appointment to the delivered order. It shows up in the patient, doctor, clinic, pharmacy and admin portals.

## Demo mode and resetting data

With `DEMO_MODE=true` you get demo accounts (`GET /api/v1/demo/accounts`), simulated payments and delivery, mock lab bookings, a mock password-reset token, and a reset endpoint.

Ways to reset:

- `pnpm db:seed`: truncate and reseed (keeps the schema).
- `pnpm db:reset`: drop the database, re-run migrations, then seed.
- `POST /api/v1/demo/reset` with an admin token and body `{ "scenarioState": "ready" | "complete" }`. This only works when `NODE_ENV !== production`. It invalidates all sessions.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev:api` | API with hot reload |
| `pnpm build` / `pnpm typecheck` | Build or typecheck all packages |
| `pnpm test` | API tests (see below) |
| `pnpm db:migrate` | Create/apply a migration in development |
| `pnpm db:deploy` | Apply existing migrations |
| `pnpm db:seed[:ready\|:complete]` | Load demo data |
| `pnpm db:up` / `pnpm db:down` | Start/stop the Docker PostgreSQL |

### Tests

Tests run against a **separate** database so your demo data is never touched. The default is `carebridge_test` on the Docker Postgres; override it with `TEST_DATABASE_URL`. Create the database once:

```bash
docker exec carebridge-postgres psql -U carebridge -c "CREATE DATABASE carebridge_test;"
pnpm test
```

The suite covers login for every demo account, registration, password reset, token/deactivation handling, the RBAC matrix, tenant isolation, route authorization, seed invariants (data volumes, golden numbering, data consistency across portals), provider onboarding, notifications, global search and doctor/organization/pharmacy/medicine discovery (filters, pagination, real slot availability).

## Web app

`apps/web` is a Vite + React SPA. Everything under `/` is public and shared by anonymous and signed-in patients (the homepage personalizes when you're logged in, per the demo data strategy). `/doctor/*`, `/organization/*`, and `/pharmacy/*` provide role-protected workspaces for doctors, clinics/hospitals, and pharmacies. Health records, lab tests, favorites, and the patient notifications list remain clearly labelled upcoming features for later phases.

- `pnpm --filter @carebridge/web dev` — dev server on 5173, proxies `/api/*` to the API on 4000
- `pnpm --filter @carebridge/web build` — typecheck + production build
- `apps/web/.env` (optional in dev): `VITE_API_URL=http://localhost:4000/api/v1`

## Documentation

- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): architecture, modules, entity map, page map, API map, RBAC matrix, demo data strategy, phases
- Planned for Phase 19: `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `RBAC.md`, `DEMO_GUIDE.md`, `PRODUCTION_READINESS.md`
