# CareBridge presentation guide

Reviewed: 2026-10-31. This is the shortest path from “new to the repository” to a confident product demo. It describes the implemented code, not just the original plan.

## The one-minute explanation

CareBridge is a demo multi-tenant healthcare marketplace. A patient can discover a doctor, book and pay for an appointment, receive a doctor-authored prescription, choose a pharmacy, place an order, and track simulated delivery. Doctors, clinics/hospitals, pharmacies, and platform staff operate on the same records through role-specific portals.

Technically, it is a TypeScript pnpm monorepo with three workspaces:

- `apps/web`: React SPA, routing, portals, forms, and TanStack Query hooks.
- `apps/api`: Express API, authentication, validation, domain services, Prisma, and demo seed data.
- `packages/shared`: roles, permissions, status machines, DTOs, and API types used by both apps.

PostgreSQL is the shared source of truth. The key architectural choice is a modular monolith: one API process, one database, and domain modules instead of several services. That keeps transactions and cross-portal consistency understandable for a demo.

Start with the interactive diagrams:

- [System architecture](../.archify/carebridge-demo-20261031-133500/carebridge-architecture.html)
- [Golden demo workflow](../.archify/carebridge-demo-20261031-133500/golden-demo-workflow.html)
- [Protected request sequence](../.archify/carebridge-demo-20261031-133500/protected-request-sequence.html)
- [Order lifecycle](../.archify/carebridge-demo-20261031-133500/order-lifecycle.html)
- [Repository knowledge graph](../graphify-out/graph.html)

## How to read the repository

Follow one request vertically instead of reading folders alphabetically:

1. Find the screen in `apps/web/src/pages` and its route in `apps/web/src/routes/router.tsx`.
2. Follow its `use-*` hook in `apps/web/src/hooks`.
3. Follow the wrapper in `apps/web/src/api` to the Express route under `apps/api/src/modules`.
4. Read the adjacent schema for trust-boundary validation.
5. Read the service for authorization, state rules, transactions, and side effects.
6. Check `apps/api/prisma/schema.prisma` for persisted relationships and constraints.
7. Check `packages/shared/src` for the status or permission contract visible to both apps.
8. Use the matching API or Playwright test as an executable example.

Example: checkout starts in the web page, passes through its hook and API wrapper, and reaches `checkout()` in the orders service. That service validates the patient, pharmacy, fulfillment type, address, prescription, stock, and current price inside a transaction; it then snapshots order data, creates payment/history/notifications, and clears the cart.

## Ten-minute demo script

### 0:00–1:00 — Frame the product

Say: “CareBridge connects a patient journey with the operational portals behind it. The point is not isolated screens; it is one record moving across roles.”

Show the [golden workflow](../.archify/carebridge-demo-20261031-133500/golden-demo-workflow.html). Name the four actors and the chain: appointment → consultation → prescription → order → delivery.

### 1:00–3:00 — Patient discovery and booking

Sign in as `patient@carebridge.demo` with `Demo@123`. Find Dr. Maya Rao, select a future slot, enter a reason, and confirm the simulated UPI payment.

Explain that slots are recurring availability minus blocks and active appointments. Booking revalidates the slot and creates the appointment, payment, history, notifications, and activity in one transaction. A partial unique index stops two active appointments from taking the same doctor/start time.

### 3:00–5:00 — Doctor consultation

In another browser profile, sign in as `doctor@carebridge.demo`. Open the appointment, start the consultation, enter demo notes, add a medicine, and complete it.

Explain that clinical text is entered manually; the application does not diagnose or generate a prescription. Completion locks the consultation, completes the appointment, and issues any draft prescription. The patient sees it because both portals query the same PostgreSQL record.

### 5:00–7:00 — Patient checkout

Return to the patient session, open the prescription, choose City Care Pharmacy, build the cart, and place a delivery order.

Explain that pharmacy matching uses approved pharmacies and current inventory. Checkout rechecks inventory and pricing, decrements stock, snapshots address and price values, creates payment/history, and clears the cart transactionally.

### 7:00–9:00 — Pharmacy fulfillment

Sign in as `pharmacy@carebridge.demo`. Review and confirm the order, prepare it, mark it ready, assign the demo agent, and advance it to delivered.

Show the [order lifecycle](../.archify/carebridge-demo-20261031-133500/order-lifecycle.html). The shared transition table drives backend validation and frontend action buttons; invalid jumps are rejected.

### 9:00–10:00 — Architecture and close

Show the [system architecture](../.archify/carebridge-demo-20261031-133500/carebridge-architecture.html) and [request sequence](../.archify/carebridge-demo-20261031-133500/protected-request-sequence.html).

Close with: “The demo’s strongest property is cross-portal consistency. The browser provides role-specific experiences, while the API revalidates identity, permissions, tenant ownership, and legal state transitions before PostgreSQL changes.”

## Three design decisions to understand

### Modular monolith

The workflow spans many domains but still needs straightforward transactions. A single API and database fit the demo without distributed consistency work. Split a service only after a concrete scaling or ownership need appears.

### Shared contracts, server-side enforcement

Roles, permission names, statuses, and DTOs are shared so the UI and API use the same vocabulary. TypeScript does not validate network input at runtime, so the API still uses Zod and service-level checks. Browser guards are UX, not security.

### Simulated integrations

Payments, delivery, documents, and video are represented well enough to prove workflow behavior without external accounts. This is not production healthcare or commerce software: there is no live payment gateway, logistics provider, file store, email/SMS transport, or video provider.

## Likely questions and strong answers

**Why not microservices?**
The domains are separated in code, but the current scale and demo goal do not justify network boundaries. Booking and checkout benefit from local database transactions.

**How is authorization enforced?**
The fetch client sends a JWT. API middleware verifies it and reloads the active user, roles, permissions, and memberships. Routes check coarse permissions; services enforce record ownership and organization scope.

**How do you prevent double booking?**
The service rechecks availability, and a migration adds a partial unique index for active appointments with the same doctor and start time. It does not prevent every overlapping-interval or same-patient concurrency case; that limitation is documented.

**How do portals stay consistent?**
They do not keep separate mock copies. Every portal calls the same API and reads shared appointments, prescriptions, orders, histories, notifications, and activity records from PostgreSQL.

**What is transactional?**
Booking groups appointment/payment/history/notifications/activity. Checkout groups stock validation and decrement, order snapshots, payment/history/notifications/activity, and cart clearing. Order state changes lock the order row.

**What happens when an order is cancelled?**
Allowed early states can be cancelled; rejection requires a reason. Inventory is restored, paid demo payments become refunded, and pending payments become failed.

**Is it safe for real patient data?**
No. Production work includes session controls, rate limiting, tenant hardening, privacy/audit review, live integrations, monitoring, backups, deployment design, and compliance review.

**What would you build next?**
For demo completeness, pharmacy inventory/settings self-service. Before broader deployment, fix the P0/P1 items in `SECURITY_AUDIT.md` and `PRODUCTION_READINESS.md` instead of adding more surface area.

## Presentation rules

- Explain paths you can trace in code; do not call a simulated integration live.
- Use “the project” for facts. Use “I chose” only for a decision you personally made and can defend.
- Keep patient and operator sessions in separate browser profiles.
- Record appointment and order numbers, then find them in admin to prove shared records.
- If a live path fails, use `pnpm db:seed:complete` and explain the completed cross-portal state.

## Rehearsal checklist

- Run `pnpm db:seed:ready`; confirm the selected slot is still in the future.
- Start API and web; verify `/api/v1/health` and login.
- Open patient and operator sessions in separate profiles.
- Keep the four diagrams open in tabs.
- Rehearse once with a timer and once with one deliberate failure question.
- Never use real patient or payment data.
