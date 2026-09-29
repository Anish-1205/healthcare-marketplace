# Environment and setup

Reviewed: 2026-09-29. Variable names only — no values, examples, or seeded credentials are reproduced here, even where they appear in [README.md](../README.md). Source: [env.ts](../apps/api/src/config/env.ts) (the authoritative, Zod-validated schema) and [apps/web/src/config/env.ts](../apps/web/src/config/env.ts). `apps/api/.env.example` and `apps/web/.env.example` exist in the repository but were not directly readable in this review session (sandboxed); `env.ts` is the more reliable source since it is the actual runtime contract.

## API environment variables (apps/api)

All validated by a Zod schema in [env.ts](../apps/api/src/config/env.ts); the process exits at startup if validation fails.

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | no (default `development`) | One of `development`, `test`, `production`. |
| `PORT` | no (default `4000`) | Coerced to a positive integer. |
| `DATABASE_URL` | **yes** | PostgreSQL connection string; no default. |
| `CORS_ORIGIN` | no (default `http://localhost:5173`) | Single origin string. |
| `JWT_SECRET` | no (has a built-in dev default) | Must be ≥32 characters; **the app refuses to start in production if this equals the built-in development default** — see [env.ts](../apps/api/src/config/env.ts). |
| `JWT_EXPIRES_IN` | no (default `12h`) | |
| `DEMO_MODE` | no (default `true`) | Boolean-like string (`true`/`false`/`1`/`0`). Gates demo accounts endpoint and password-reset token disclosure — see [SECURITY_AUDIT](SECURITY_AUDIT.md) S01. |
| `DEMO_SCENARIO_STATE` | no (default `ready`) | One of `ready`, `complete`. |
| `LOG_REQUESTS` | no (default `true`) | Boolean-like string. |

Derived (not an env var, computed from the above): `devToolsEnabled = DEMO_MODE && NODE_ENV !== 'production'` — gates demo data reset regardless of `DEMO_MODE`.

## Web environment variables (apps/web)

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_API_URL` | no (default `/api/v1`) | Only variable referenced via `import.meta.env` found in [apps/web/src/config/env.ts](../apps/web/src/config/env.ts). In dev, Vite proxies `/api` to the local API so this is typically left unset. |

## Setup steps (from README.md and package.json scripts)

1. **Prerequisites**: Node.js ≥20.19, pnpm 10.31.0 (`corepack enable` or install globally), PostgreSQL (via the bundled Docker Compose service or a compatible local install).
2. **Configure environment**: copy `apps/api/.env.example` to `apps/api/.env` and set the variables listed above (`DATABASE_URL` is mandatory; set a real `JWT_SECRET` for anything beyond local dev).
3. **Install dependencies**: `pnpm install` — root `postinstall` script builds `@carebridge/shared` first ([package.json](../package.json)); the API's own `postinstall` runs `prisma generate` ([apps/api/package.json](../apps/api/package.json)).
4. **Start the database** (if using Docker): `pnpm db:up` (runs `docker compose up -d postgres`; requires Docker running).
5. **Apply migrations**: `pnpm db:deploy` (`prisma migrate deploy`) for an existing migration history, or `pnpm db:migrate` (`prisma migrate dev`) when authoring new migrations.
6. **Seed demo data**: `pnpm db:seed` (default scenario), or `pnpm db:seed:ready` / `pnpm db:seed:complete` for a specific scenario state. This is destructive — see [SECURITY_AUDIT](SECURITY_AUDIT.md) S07 and [DECISIONS_LOG](DECISIONS_LOG.md).
7. **Run the API**: `pnpm dev:api` (`tsx watch src/server.ts`), serving `/api/v1` (health check at `/api/v1/health`).
8. **Run the web app**: `pnpm --filter @carebridge/web dev` (Vite dev server, proxies `/api` to the local API).
9. **Stop the database**: `pnpm db:down`.
10. **Full local reset**: `pnpm db:reset` (`prisma migrate reset --force`) — destructive, drops and recreates the schema.

## Build, test, and verification commands

| Command | Effect |
| --- | --- |
| `pnpm build` | `pnpm -r build` — builds all workspaces. |
| `pnpm typecheck` | `pnpm -r typecheck` — `tsc --noEmit` per workspace (confirmed passing in this review — see [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md)). |
| `pnpm test` | `pnpm -r test` — Vitest in `apps/api` and `apps/web`. |
| `pnpm test:e2e` | Runs Playwright specs in `apps/web` ([playwright.config.ts](../apps/web/playwright.config.ts)). |
| `pnpm test:phase18` / `pnpm test:demo` | Chains typecheck → build → test → e2e. |

Note: `apps/web`'s `lint` script (`eslint src`) is present but **does not currently run** — ESLint is not installed and no config exists. See [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md) CQ01.

## Credentials

This document intentionally omits demo account emails/passwords and any `.env.example` values. See [README.md](../README.md) for the seeded demo login list if needed locally — do not copy those values into any shared or production configuration.
