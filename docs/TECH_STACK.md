# Tech stack

Reviewed: 2026-09-29. Versions are as declared in each package.json; installed/resolved versions are **unverified** without a lockfile inspection.

## Workspace

pnpm workspaces over 4 packages: `apps/api`, `apps/web`, `packages/shared` [pnpm-workspace.yaml](../pnpm-workspace.yaml), [package.json](../package.json). Root `packageManager` pins `pnpm@10.31.0`; `engines.node` requires `>=20.19`. `postinstall` builds `@carebridge/shared` first so the other workspaces can import its compiled output.

Root scripts run recursively (`pnpm -r`) for `build`, `typecheck`, `test`; `test:phase18`/`test:demo` chain typecheck → build → test → e2e. Database scripts (`db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:seed:ready`, `db:seed:complete`, `db:reset`, `db:up`, `db:down`) delegate to `@carebridge/api` or Docker Compose.

## apps/api — Express backend

Source: [apps/api/package.json](../apps/api/package.json).

- Language: TypeScript 5.9, compiled with `tsc` (CommonJS module, Node module resolution) — [tsconfig.json](../apps/api/tsconfig.json), [tsconfig.base.json](../tsconfig.base.json).
- Runtime: Express 5.1, Node >=20.19.
- Database: Prisma ORM/client 6.19, PostgreSQL.
- Auth/crypto: `jsonwebtoken` 9.0, `bcryptjs` 3.0.
- Validation: Zod 4.1.
- HTTP hardening: `helmet` 8.1, `cors` 2.8.
- Config: `dotenv` 17.2.
- Dev/build tooling: `tsx` (dev watch + seed execution), `typescript` 5.9, `@types/*` for node/express/cors/jsonwebtoken/supertest.
- Testing: Vitest 3.2, Supertest 7.1 (`test`, `test:watch` scripts).
- Build output: `tsc -p tsconfig.build.json` to `dist/`; entrypoint `dist/src/server.js`.

## apps/web — React SPA

Source: [apps/web/package.json](../apps/web/package.json).

- Language: TypeScript 5.9 — [tsconfig.json](../apps/web/tsconfig.json) (ES2022 target, Bundler resolution, `@/*` path alias to `src/*`), plus a separate [tsconfig.e2e.json](../apps/web/tsconfig.e2e.json) typechecked independently in `typecheck`.
- Build tool: Vite 6.0 (`@vitejs/plugin-react`).
- UI: React 18.3 / React DOM 18.3, React Router DOM 6.28.
- Data fetching/cache: TanStack Query 5.62.
- Forms/validation: React Hook Form 7.54, `@hookform/resolvers` 3.9, Zod 4.1 (shared with the API).
- State: Zustand 5.0 (persisted auth store).
- Styling: Tailwind CSS 3.4, `tailwindcss-animate`, `postcss`, `autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- Icons: `lucide-react`.
- Testing: Vitest 3.2 with `jsdom`; Playwright `@playwright/test` 1.63 for e2e (`test:e2e`) — see [playwright.config.ts](../apps/web/playwright.config.ts).
- Lint: `eslint src` script exists in package.json, but no ESLint config file was found in the repo (see [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md)).
- Build: `tsc --noEmit` (typecheck) then `vite build`.

## packages/shared

Source: [packages/shared/package.json](../packages/shared/package.json).

- Pure TypeScript library, no runtime dependencies declared; only `typescript` 5.9 as a devDependency.
- Compiled with `tsc` (CommonJS, declarations emitted) to `dist/`, consumed by both apps via `workspace:*`.
- Contents: RBAC permission matrix, role names, API contract types, domain constants (see [FILE_MAP](FILE_MAP.md) and [ARCHITECTURE](ARCHITECTURE.md)).

## Shared TypeScript config

[tsconfig.base.json](../tsconfig.base.json) sets `strict: true`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `esModuleInterop`, target `ES2022`. All three workspace tsconfigs extend it. See [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md) for the observed typecheck result.

## Infrastructure (local dev)

`db:up`/`db:down` scripts run `docker compose up -d postgres` / `docker compose down` against a root Compose file (not inspected further here; presence confirmed via root [package.json](../package.json) scripts only). Any other infrastructure (hosting, CI, secrets manager) is **unverified**.
