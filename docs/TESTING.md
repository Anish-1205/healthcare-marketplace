# Demo testing and verification

Phase 20 results, fixes and remaining acceptance gaps are recorded in [DEMO_VERIFICATION.md](DEMO_VERIFICATION.md). `pnpm test:demo` runs the full sequential check suite; `pnpm test:phase18` remains available with the same commands.

## Run the checks

Install dependencies and configure the API environment as described in the README. Start PostgreSQL with `pnpm db:up`. The tests use `carebridge_test` on port 5433; create it once if needed:

```sh
docker exec carebridge-postgres psql -U carebridge -c "CREATE DATABASE carebridge_test;"
pnpm test:phase18
```

`test:phase18` runs workspace typechecks (including Playwright tests), production builds, API/frontend tests, then browser tests. Individual commands:

```sh
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
pnpm --filter @carebridge/web test:e2e golden-flow.spec.ts
```

Both integration and browser setup apply migrations and reseed the test database. Run these suites sequentially because they share that database. `TEST_DATABASE_URL` must point to a disposable test database, never the development demo or production database.

Playwright uses installed Microsoft Edge and starts dedicated API/web servers on ports 4001/5174. Leave those ports free. Browser failures retain a trace under `apps/web/test-results`; the golden flow also attaches screenshots at major checkpoints. Open a failed trace with `pnpm --filter @carebridge/web exec playwright show-trace <trace-path>`.

If Windows reserves those ports, set `E2E_API_PORT` and/or `E2E_WEB_PORT` to available ports. All browser fixtures and server URLs use these settings. `TEST_DATABASE_URL` can likewise point to a disposable PostgreSQL database on another port. See the Phase 20 report for a PowerShell example.

`demo-verification.spec.ts` adds real browser checks for pharmacy registration/document review/approval and subsequent login/public discovery, clinic doctor association/schedule persistence/operations/reports, marketplace pagination and populated desktop/mobile homepages. It does not cover the unimplemented pharmacy self-service setup screens.

## Critical coverage

| Requirement | Tests and assertions |
|---|---|
| Authentication | `auth.test.ts`: demo logins, invalid credentials/tokens, registration, password reset, deactivated sessions |
| RBAC | `rbac.test.ts` plus route tests: patient/provider/platform permissions and organization roles |
| Appointment booking | `appointments.test.ts`: availability, duplicate bookings, concurrent patients competing for one slot, payment rollback, cancellation/refund, rescheduling, private reads |
| Prescription creation | `consultations.test.ts`: treating doctor authorization, draft privacy, issue, immutable issued prescriptions, automatic issue on consultation completion |
| Pharmacy order creation | `cart.test.ts`, `orders.test.ts`: prescription matching, real stock/prices, address ownership, transaction rollback, concurrent checkout, simulated payments |
| Tenant isolation | Organization, doctor, appointment, order and lab suites: scoped lists/details/actions; pharmacy delivery changes cannot cross tenants |
| Order progression | `orders.test.ts`: review, confirmation, preparation, delivery/pickup, skipped transitions, refunds, stock restoration, timestamped history |
| Connected demo | `golden-flow.spec.ts`: real UI actions from booking through prescription and delivery, separate role sessions, patient tracking after each pharmacy action, admin visibility |

The connected demo runs at 1440px and 390px, checks horizontal overflow at checkpoints, and fails on JavaScript exceptions or failed API responses. It uses demo accounts and new records created during the test, with no mocked API responses or pre-created consultation/order shortcuts.

## Manual golden-flow checklist

For a presenter walkthrough on the development database, start the API and web app, then use these accounts with password `Demo@123`:

1. **Patient** (`patient@carebridge.demo`): search doctors for Maya, open Dr. Maya Rao, choose an available slot, Continue, and confirm the simulated UPI payment. Record the appointment number.
2. **Doctor** (`doctor@carebridge.demo`): find that appointment, Start consultation, type clinical notes, Add medicine, select a catalogue medicine stocked by City Care (the demo Hydrocortisone entry), fill the required prescription fields, and Add to prescription. Complete consultation and confirm. Verify the prescription is issued and notes are locked.
3. **Patient**: open the new prescription, Order Medicines, choose City Care Pharmacy, Proceed to Checkout, enter a delivery address, and Place Order with simulated UPI. Record the order number.
4. **Pharmacy** (`pharmacy@carebridge.demo`): open the order, Review prescription, Confirm stock & pricing, Preparing medicines, Ready for pickup, Assign demo delivery agent, Mark Picked up, Mark On the way, and Mark Delivered.
5. After each pharmacy action, refresh the **patient** order detail and check the new state and timestamp. At completion, verify the full order and delivery timelines.
6. **Platform Admin** (`admin@carebridge.demo`): check the same appointment and order in the admin lists. Repeat the key screens at a narrow/mobile viewport and check for clipping or unusable controls.

The automated browser walkthrough exercises this checklist and saves screenshots for visual review. A human presenter walkthrough is a separate check; automated results should not be reported as a human-run manual session.
