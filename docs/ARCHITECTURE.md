# Architecture

CareBridge is a pnpm workspace with three packages: `apps/web` (React/Vite SPA), `apps/api` (Express 5 API), and `packages/shared` (TypeScript contracts, roles, permissions, status enums, demo accounts). PostgreSQL is accessed through Prisma in the API. The web app never connects to the database.

```text
Browser (React Router, TanStack Query)
  → /api/v1 (Express middleware → route → service)
  → Prisma transactions → PostgreSQL
             ↘ @carebridge/shared contracts and RBAC
```

The API mounts domain routers in `apps/api/src/routes/index.ts`. Routes parse inputs with Zod and use bearer-token middleware; services enforce record ownership and organization membership. `packages/shared/src/permissions.ts` defines role capabilities. The API applies those permissions and then checks the specific patient, doctor, or organization in the service layer. Public catalog endpoints stay accessible without a token.

The main transaction chains are booking → consultation → prescription and cart → order → pharmacy review → delivery. A simulated payment is written in the same booking/checkout transaction as its parent record. Status history and notifications derive from those changes. PostgreSQL's partial unique appointment index prevents two patients booking the same active doctor slot.

The browser has public/patient routes plus protected `/doctor`, `/organization`, `/pharmacy`, and `/admin` portals (`apps/web/src/routes/router.tsx`). TanStack Query holds server data; the Zustand auth store holds the session. Vite proxies `/api` to port 4000 during development. Browser tests start isolated servers on 4001/5174 against `carebridge_test`.

`apps/api/src/demo/seed` supplies deterministic, linked demo records. `ready` leaves the presenter flow to perform; `complete` includes it. The test setup migrates and reseeds only the test database. Payments, delivery agents, documents, lab reports, and video consultations are demo simulations.
