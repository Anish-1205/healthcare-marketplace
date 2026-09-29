# Phase 20 — Full demo verification

Verified on **2026-09-29**. The primary client demo passes on desktop and mobile. The verification pass is complete, but full master-prompt acceptance remains open: pharmacy self-service configuration and the deferred Phase 17 polish are incomplete.

## Results

| Check | Result |
|---|---|
| Dependency installation | `pnpm install --offline --frozen-lockfile` passed using the existing local cache; shared build and Prisma generation passed. This was not a clean-machine network install. |
| Workspace TypeScript and production builds | Passed; web build/typecheck repeated after application and test-configuration changes. |
| Backend integration tests | **206/206 passed**, 18 files, real PostgreSQL. |
| Frontend unit tests | **25/25 passed**, 4 files. |
| Edge browser suite | **25/25 passed**, including all eight demo-account logins and six new Phase 20 checks. |
| Fresh database migrations | Both committed migrations applied successfully to fresh verification databases. |
| Ready seed | Integration/browser setup seeded the ready scenario; seed tests checked volumes, golden numbering and linked records. |
| Complete seed | `pnpm db:deploy` and `pnpm db:seed:complete` passed on a second fresh database. A SQL join confirmed completed appointment → issued `RX-2026-00125` → delivered `ORD-2026-0042`, at Sunrise Family Clinic and City Care Pharmacy. |

After making screenshots start at the top of each page, all **8 focused demo/golden-flow tests passed again**.

### Client scenarios

1. **Booking through delivery — passed.** UI actions with separate patient, doctor, pharmacy and admin sessions, at 1440px and 390px: discovery, future slot, simulated UPI, consultation, manually entered prescription, issue, pharmacy selection, checkout, prescription review, fulfillment, delivery and admin visibility. Patient tracking is checked after each pharmacy action; order/delivery histories and timestamps are asserted. The tests reject browser exceptions and failed API responses.
2. **Provider registration and approval — passed for the implemented portion.** A new pharmacy owner submits real form fields and mock document metadata; the organization is pending and excluded from public search. Admin reviews the document and approves it. The new owner signs out/in and the approved public profile is available. **The master prompt's subsequent pharmacy profile, delivery settings and inventory configuration steps are not implemented.**
3. **Clinic operations — passed.** Clinic login, populated dashboard, doctor association, schedule save and persistence after reload, upcoming appointments, patient roster and activity/performance reports. Writes go through UI controls against the real API.

### Visual review

Reviewed screenshots of desktop/mobile homepages, clinic reports, the completed consultation and mobile delivery tracking. Marketplace sections are populated; report totals and trends contain data; issued prescriptions and delivery timelines are visible. Homepage and golden-flow checkpoints assert no horizontal page overflow. Horizontal product/provider carousels intentionally scroll.

This was automated browser interaction plus screenshot inspection. A human presenter rehearsal has not been performed. Screenshots are generated in `apps/web/test-results/` and attached to Playwright results; they are ignored by Git and replaced by subsequent runs.

## Fixes from this pass

- Fixed pagination in doctor, medicine, clinic/hospital and pharmacy listings: changing pages no longer immediately clears the page parameter. Browser regressions cover next/previous, reload and sorting back to page one on the multi-page doctor/medicine seed data.
- Added pharmacy pending/rejected approval messages, so newly registered owners can see their status.
- Connected provider-registration labels to inputs for accessible form entry.
- Added browser walkthroughs for provider approval and clinic operations, plus desktop/mobile homepage checks.
- Made browser API/web ports configurable with `E2E_API_PORT` / `E2E_WEB_PORT`; existing defaults remain 4001/5174.
- Added `pnpm test:demo` as the full sequential verification command.

## Remaining acceptance gaps

- **Scenario 2 cannot be presented in full:** pharmacy profile, delivery settings and inventory management are absent. The pharmacy portal currently provides orders and delivery processing. Other pharmacy pages listed in the master prompt (dashboard, medicine management, customers and reports) are also absent.
- **Phase 17 remains partial.** Its deferred UI work is recorded in the implementation plan. This verification pass does not close that phase.
- Dashboard charts currently use CSS bars instead of the master prompt's specified Recharts library.
- A clean-machine setup and human presenter rehearsal remain unverified. On this Windows machine the default database and browser ports were unavailable; the checks used alternative ports as described below.
- Production builds retain non-failing dependency annotation and bundle-size warnings. Prisma also warns that its package.json configuration is deprecated for a future major version.

## Reproduce

With PostgreSQL, the separate `carebridge_test` database and Microsoft Edge available, follow [TESTING.md](TESTING.md) and run:

```sh
pnpm test:demo
```

This run used a temporary container named `carebridge-phase20-postgres` on localhost port **15433**, with databases `carebridge_test` and `carebridge_complete`. Existing development data and `.env` files were left unchanged. Windows denied binding ports 5433 and 5174; Vite ran on **15174**, and the test API ran on **4001**.

The temporary container was stopped after verification; its data was retained. To repeat this run on the same machine:

```powershell
docker start carebridge-phase20-postgres
$env:TEST_DATABASE_URL='postgresql://carebridge:carebridge@localhost:15433/carebridge_test?schema=public'
$env:E2E_WEB_PORT='15174'
pnpm test:demo
```

The API and browser suites reseed the same test database, so run them sequentially. Choose free ports and use only disposable databases. See [DEMO_GUIDE.md](DEMO_GUIDE.md) for presenter steps and the current scenario boundary.
