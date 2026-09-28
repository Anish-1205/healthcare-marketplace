# CareBridge — Implementation Plan

CareBridge is a **sales demo** of a multi-tenant healthcare marketplace. It connects patients with doctors, clinics, hospitals and pharmacies, and includes an internal admin portal. The priorities are a working end-to-end demo, a polished UI, and realistic data that stays consistent across portals. Production hardening is covered in `PRODUCTION_READINESS.md`.

> This is a demonstration application. Healthcare information shown here is sample data and must not be used for medical decisions.

---

## 1. System architecture

```
┌──────────────────────────────┐       REST /api/v1 (JSON, JWT Bearer)      ┌───────────────────────────────┐
│ apps/web  (React + Vite)     │ ─────────────────────────────────────────▶ │ apps/api  (Express 5 + TS)    │
│  Public / Patient / Doctor / │                                            │  modular monolith             │
│  Organization / Pharmacy /   │ ◀───────── { success, data, meta } ─────── │  modules/<domain>/*           │
│  Admin layouts               │                                            │  Prisma ORM                   │
└──────────────┬───────────────┘                                            └───────────────┬───────────────┘
               │   packages/shared (roles, RBAC matrix, statuses, API types)                 │
               └──────────────────────────────┬──────────────────────────────────────────────┘
                                              ▼
                                   PostgreSQL (single database)
```

- **Modular monolith.** One API process and one database. Each domain module owns its routes, schemas and service. There are no microservices, queues, Redis or search engines.
- **Shared package.** `@carebridge/shared` is the single source of truth for roles, the permission matrix, status enums, allowed status transitions, demo accounts and the API response contract. Both the API and the web app use it.
- **Auth.** Access tokens are JWTs signed with HS256 and valid for 12h. On every request the API reloads the user's roles, permissions and tenant memberships from the database, so deactivating a user or changing a role takes effect immediately.
- **Timezone.** Timestamps are stored in UTC. Scheduling logic works in IST (`Asia/Kolkata`) through `utils/time.ts`, so behaviour doesn't depend on the server's timezone.
- **Simulated integrations.** Payments, delivery, video consultation, SMS/email and lab processing are all simulated. They write real database records, so every portal sees the same state.

### Key decisions

| Decision | Choice | Why |
|---|---|---|
| ORM | Prisma 6 (`prisma-client-js`) | Mature and stable. Prisma 7's config/adapter changes add risk without demo value. |
| Express | v5 | Async handler errors reach the error middleware natively, so no wrapper is needed. |
| Password hashing | `bcryptjs` | Same bcrypt algorithm with no native build step on Windows/macOS/Linux. |
| Validation | Zod v4, called in handlers via `parse(schema, input)` | Type inference flows into handlers. One consistent `VALIDATION_ERROR` shape. |
| Money | `Decimal(10,2)` INR, serialized as JSON numbers | Exact storage, simple for the frontend. |
| Human-readable numbers | `sequence_counters` table + atomic upsert | Race-safe `RX-2026-00125`, `ORD-2026-0042`, `APT-…`, `LAB-…`, `TXN-…`. |
| Organization types | Enum (`CLINIC`, `HOSPITAL`, `PHARMACY`) plus a free-text `category` | One tenant table. A lookup table added no value. |
| RBAC storage | Code matrix in `shared`, mirrored to `roles`/`permissions` tables by the seed | Typed, fast checks. Tables let the admin portal display the matrix. |
| Tenant isolation | Application-level checks (`tenant.service.ts`) | Per the brief. Row-level security is listed as a production item. |
| Clinical text | Stored verbatim; the API never generates or suggests diagnosis, dosage, frequency or timing | Required by the brief. The builder offers typing shortcuts only. |
| Draft prescriptions | Numbered on creation, visible only to their author until issued | `prescriptionNumber` is unique and non-null in the schema, and a draft is not yet a document the patient holds. |
| Patient history in the workspace | The treating doctor sees the patient's earlier consultations and issued prescriptions, including other doctors' | That context is the point of the visit. Consent-based gating is a production item. |
| Checkout inventory | Reserve stock, snapshot prices/address, create the order/payment, and clear the cart in one transaction | Conditional stock updates prevent overselling; a cart row lock prevents duplicate checkout. Cancellation/rejection returns reserved quantities. |
| Pharmacy review | Require prescription review for prescription orders; allow lower prices and approved quantities (including zero for omitted lines) | Never increase what the patient agreed to pay. At least one medicine must remain; otherwise reject. Demo payment amounts reconcile to the approved total. |
| Fulfillment progression | Pending → review when needed → confirmed → preparing → ready; pickup completes there, delivery requires assigned → picked up → on the way → delivered | Prevent skipped states. Delivery pickup marks the order out for delivery; delivery completion settles cash and closes the order. Cancellation ends when preparation begins. |

---

## 2. Major modules (API)

| Module | Responsibility | Phase |
|---|---|---|
| `auth` | Register patient, login, logout, `me`, mock forgot/reset password | 3 ✅ |
| `demo` | Demo status, demo accounts, **dev-only reset** (re-runs the seed) | 4 ✅ |
| `patients` | Profile, addresses, emergency contact, preferred pharmacy | 6–7 |
| `doctors` / `specialties` | ✅ Discovery, filters, profile, real availability/slot calculation, self-service profile/availability/dashboard/patients | 7 ✅, 9 ✅ |
| `organizations` | ✅ Clinic/hospital/pharmacy discovery, profile, doctors, services, open/closed status | 7 ✅ (self-service mgmt in 13) |
| `appointments` | ✅ Book (simulated payment), cancel, reschedule, history, role-scoped reads | 8 ✅ (doctor status actions in 9) |
| `consultations` | ✅ Start from an appointment, workspace notes / diagnosis / observations / follow-up (all hand-typed), complete | 10 ✅ |
| `prescriptions` | ✅ Draft → issue, hand-typed dosage lines, role-scoped reads, print view, ranked pharmacy availability | 10 ✅, 11 ✅ |
| `medicines` / `pharmacies` / `inventory` | ✅ Catalogue browse, categories, pharmacy price/stock, "shop this pharmacy", pharmacy-specific add-to-cart | 7 ✅, 11 ✅ |
| `cart` | ✅ Patient server cart, live prices/stock, quantity updates/removal/clear, confirmed pharmacy replacement, prescription-to-cart with unmatched lines | 11 ✅ |
| `orders` / `payments` / `deliveries` | ✅ Transactional checkout, scoped order lists/details, pharmacy review/quantity/price confirmation, status history, cancellation/refund, simulated payments and delivery | 12 ✅ |
| `notifications` | In-app notifications (service + list / unread count / mark read) | 5 ✅ (events wired in 8–12) |
| `search` / `reference` | Universal header search; specialties, medicine categories, public config | 5 ✅ |
| `reviews` / `favorites` | Ratings (with moderation) and saved providers | 7, 16 |
| `labs` / `health-records` | ✅ Lab catalogue/packages, home collection bookings, status/refund flow, aggregated document vault (mock upload) | 15 ✅ |
| `onboarding` | Provider registration → `PENDING_APPROVAL` (approval UI in 14) | 5 ✅ |
| `admin` / `analytics` / `activity-logs` | Platform oversight, approvals, charts, activity feed | 14 |

Cross-cutting code: `middleware/` (auth, RBAC, errors, request logging), `services/` (auth context, tenant access, activity log), `utils/` (HTTP helpers, errors, sequences, IST time).

---

## 3. Database entity map

Full schema: `apps/api/prisma/schema.prisma`. Hand-written CHECK constraints are in the init migration.

```
users ─┬─< user_roles >── roles ──< role_permissions >── permissions
       ├── patients ──< addresses (via user)
       ├── doctors ──< doctor_specialties >── specialties
       │      ├──< doctor_organizations >── organizations
       │      ├──< doctor_availability (optional organization)
       │      └──< doctor_blocked_dates
       ├──< organization_staff >── organizations ──< organization_services
       ├── platform_employees
       ├──< notifications
       └──< password_reset_tokens

patients ──< appointments >── doctors      (optional organization)
appointments ──< appointment_status_history
appointments ── consultations ──< prescriptions ──< prescription_items >── medicines

medicine_categories ──< medicines ──< pharmacy_inventory >── organizations (PHARMACY)
patients ── carts ──< cart_items
patients ──< orders >── organizations (PHARMACY)   (optional prescription or uploaded document)
orders ──< order_items, order_status_history ;  orders ── deliveries ──< delivery_status_history
payments → exactly one of appointment | order | lab_booking   (CHECK)
reviews / favorites → exactly one of doctor | organization    (CHECK)
lab_tests ──< lab_package_items (self-join) ;  patients ──< lab_bookings ──< lab_booking_items
documents (patient health records, organization registration docs)
activity_logs, platform_settings, sequence_counters
```

Integrity rules:
- Rating is between 1 and 5. Quantities are greater than 0. Stock is 0 or more. Selling price is between 0 and MRP. Availability days are 0–6 with start < end. Appointments have start < end.
- Orders and appointments snapshot fees, prices and the delivery address.
- Status history tables record who changed what and when. The tracking timelines use them.

---

## 4. Portal / page map

| Portal (layout) | Routes |
|---|---|
| **Public / Patient** (`PublicLayout`, `PatientLayout`) | `/`, `/login`, `/register`, `/doctors`, `/doctors/:id`, `/doctors/:id/book`, `/clinics`, `/organizations/:id`, `/medicines`, `/medicines/:id`, `/medicine-categories/:slug`, `/pharmacies`, `/pharmacies/:id`, `/lab-tests`, `/lab-tests/:id`, `/cart`, `/checkout`, `/appointments`, `/appointments/:id`, `/prescriptions`, `/prescriptions/:id`, `/orders`, `/orders/:id`, `/health-records`, `/lab-bookings`, `/lab-bookings/:id`, `/favorites`, `/notifications`, `/profile`, `/profile/addresses`, `/register/provider` |
| **Doctor** (`DoctorLayout`) ✅ | `/doctor`, `/doctor/appointments`, `/doctor/appointments/:id`, `/doctor/patients`, `/doctor/patients/:id`, `/doctor/consultations`, `/doctor/consultations/:id`, `/doctor/prescriptions`, `/doctor/prescriptions/:id`, `/doctor/availability`, `/doctor/profile`, `/doctor/notifications` |
| **Pharmacy** (`PharmacyLayout`) | `/pharmacy`, `/pharmacy/orders`, `/pharmacy/orders/:id`, `/pharmacy/prescriptions`, `/pharmacy/inventory`, `/pharmacy/medicines`, `/pharmacy/deliveries`, `/pharmacy/customers`, `/pharmacy/reports`, `/pharmacy/profile`, `/pharmacy/settings` |
| **Clinic / Hospital** (`OrganizationLayout`) | `/organization`, `/organization/doctors`, `/organization/appointments`, `/organization/patients`, `/organization/services`, `/organization/staff`, `/organization/schedules`, `/organization/reports`, `/organization/profile` |
| **Admin** (`AdminLayout`) | `/admin`, `/admin/organizations`, `/admin/organizations/:id`, `/admin/doctors`, `/admin/doctors/:id`, `/admin/patients`, `/admin/pharmacies`, `/admin/appointments`, `/admin/orders`, `/admin/approvals`, `/admin/employees`, `/admin/reports`, `/admin/activity`, `/admin/settings` |

After login, users land on the portal returned in `user.portal`, which `primaryPortal(roles)` computes.

---

## 5. REST API map (`/api/v1`)

All responses use `{ success, data, meta? }` or `{ success: false, error: { code, message, details? } }`. ✅ means implemented.

| Area | Endpoints |
|---|---|
| Health | ✅ `GET /health` |
| Auth | ✅ `POST /auth/register` · ✅ `POST /auth/login` · ✅ `POST /auth/logout` · ✅ `GET /auth/me` · ✅ `POST /auth/forgot-password` · ✅ `POST /auth/reset-password` |
| Demo | ✅ `GET /demo/status` · ✅ `GET /demo/accounts` · ✅ `POST /demo/reset` *(non-production, `DEMO_MODE`, `demo.reset` permission)* |
| Onboarding | ✅ `POST /onboarding/doctor` · ✅ `POST /onboarding/organization` (+ mock documents) |
| Search | ✅ `GET /search?q=` (doctors, specialties, medicines, clinics, hospitals, pharmacies — each result carries its frontend `href`) |
| Reference | ✅ `GET /config` · ✅ `GET /specialties` · ✅ `GET /medicine-categories` |
| Notifications | ✅ `GET /notifications?unread=&page=` · ✅ `GET /notifications/unread-count` · ✅ `POST /notifications/:id/read` · ✅ `POST /notifications/read-all` |
| Patients | `GET/PATCH /patients/me` · `GET/POST/PATCH/DELETE /patients/me/addresses` |
| Doctors | ✅ `GET /doctors` (filters: q, specialty, organizationId, type, feeMax, minRating, language, locality; sort: rating/fee/experience/name) · ✅ `GET /doctors/:id` (id or slug) · ✅ `GET /doctors/:id/slots?date=` (real availability minus booked/blocked) |
| Doctor self | ✅ `GET/PATCH /doctors/me` · ✅ `GET/PUT /doctors/me/availability` · ✅ `POST/DELETE /doctors/me/blocked-dates` · ✅ `GET /doctors/me/dashboard` · ✅ `GET /doctors/me/patients` · ✅ `GET /doctors/me/patients/:id` |
| Organizations | ✅ `GET /organizations` (type csv, locality, specialty, q) · ✅ `GET /organizations/:id` (id or slug; services, doctors, reviews, open/closed status) · ✅ `GET/PATCH/POST/PUT /organizations/me/*` (profile, doctors, staff, services, schedules, dashboard, reports) |
| Appointments | ✅ `POST /appointments` · ✅ `GET /appointments` (scoped by role) · ✅ `GET /appointments/:id` · ✅ `POST /appointments/:id/cancel` · ✅ `POST /appointments/:id/reschedule` · ✅ `POST /appointments/:id/status` (confirm/check-in/no-show) |
| Consultations | ✅ `POST /appointments/:id/consultation` (start / re-open) · ✅ `GET /consultations` · ✅ `GET/PATCH /consultations/:id` · ✅ `POST /consultations/:id/complete` |
| Prescriptions | ✅ `POST /prescriptions` · ✅ `PATCH /prescriptions/:id` · ✅ `POST /prescriptions/:id/issue` · ✅ `GET /prescriptions` · ✅ `GET /prescriptions/:id` · ✅ `GET /prescriptions/:id/pharmacies` (ranked availability) |
| Medicines | ✅ `GET /medicines` (q, category, requiresPrescription, pharmacyId — "shop this pharmacy"; sort: name/mrp) · ✅ `GET /medicines/:id` (pharmacy offers, cheapest first) |
| Pharmacies | ✅ `GET /pharmacies` (an Organization of type PHARMACY; locality, deliveryAvailable, acceptsPrescriptions) · ✅ `GET /pharmacies/:id` · `GET/PATCH /pharmacies/me/*` (profile, settings, inventory, orders, deliveries, customers, reports, dashboard) |
| Cart | ✅ `GET /cart` · ✅ `POST /cart/items` · ✅ `PATCH /cart/items/:medicineId` · ✅ `DELETE /cart/items/:medicineId` · ✅ `DELETE /cart` · ✅ `POST /cart/from-prescription` |
| Orders | ✅ `GET /orders/checkout` (cart, saved addresses, configured platform fee) · ✅ `POST /orders` (checkout) · ✅ `GET /orders` (role-scoped, status filter, pagination) · ✅ `GET /orders/:id` · ✅ `POST /orders/:id/status` (pharmacy review/approved quantities/prices and progression) · ✅ `POST /orders/:id/cancel` (own order, before preparation) |
| Payments | ✅ `POST /payments/simulate` (existing order payment, patient-owned, idempotent; cash settles on completion) · ✅ `GET /payments` (patient/platform scope, pagination) |
| Deliveries | ✅ `POST /orders/:id/delivery` (assign simulated agent to a ready delivery order) · ✅ `POST /deliveries/:id/status` (strict progression; synchronizes order history/status) |
| Engagement | ✅ `GET/POST /reviews` · ✅ `GET /reviews/eligibility` · ✅ `GET/POST /favorites` · ✅ `DELETE /favorites/:id` · ✅ `GET /admin/reviews` · ✅ `POST /admin/reviews/:id/approve` / `reject` |
| Labs & records | ✅ `GET /lab-tests` · ✅ `GET /lab-tests/categories` · ✅ `GET /lab-tests/:id` · ✅ `GET /lab-bookings/context` · ✅ `POST /lab-bookings` · ✅ `GET /lab-bookings` · ✅ `GET /lab-bookings/:id` · ✅ `POST /lab-bookings/:id/cancel` · ✅ `GET /health-records` · ✅ `GET/POST/DELETE /health-records/documents` |
| Admin | `GET /admin/overview` · `GET /admin/{organizations,doctors,patients,pharmacies,appointments,orders,employees,activity}` · `POST /admin/approvals/:type/:id/{approve,reject}` · `PATCH /admin/users/:id/status` · `POST/PATCH /admin/employees` · `GET/PATCH /admin/settings` · `GET /admin/reports/*` |

Lists support `page`, `pageSize` (max 100), filters and `sort` where useful.

---

## 6. RBAC matrix

The source is `packages/shared/src/permissions.ts`. Middleware such as `requirePermission(...)` gates routes. Ownership and tenant checks happen in services.

| Capability | PATIENT | DOCTOR | CLINIC/HOSP ADMIN | CLINIC/HOSP STAFF | PHARMACY ADMIN | PHARMACY STAFF | PLATFORM EMPLOYEE | PLATFORM ADMIN | SUPER ADMIN |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Own profile, appointments, prescriptions, orders, records | ✅ | | | | | | | | ✅ |
| Book appointments, cart, order, review, favorite, lab booking | ✅ | | | | | | | | ✅ |
| Doctor profile & availability | | ✅ | | | | | | | ✅ |
| Own appointments, consultations, prescriptions, assigned patients | | ✅ | | | | | | | ✅ |
| Organization appointments & patients | | | ✅ | ✅ | | | | | ✅ |
| Organization profile, doctors, staff, services, reports | | | ✅ | | | | | | ✅ |
| Pharmacy orders, inventory, deliveries | | | | | ✅ | ✅ | | | ✅ |
| Pharmacy profile, staff, reports | | | | | ✅ | | | | ✅ |
| Platform dashboard & read-all, approvals, review moderation, activity log | | | | | | | ✅ | ✅ | ✅ |
| Users, organizations, employees, settings, demo reset | | | | | | | | ✅ | ✅ |

**Tenant rule.** Organization-scoped users only reach organizations where they hold an active `organization_staff` membership. `adminOnly` actions also require the `ADMIN` staff role. Doctors reach data through their own `doctorId`, and patients through their own `patientId`. Platform roles bypass tenant checks.

---

## 7. Folder structure

```
healthcare-marketplace/
├── apps/
│   ├── api/
│   │   ├── prisma/            schema.prisma · migrations/ · seed.ts
│   │   ├── src/
│   │   │   ├── config/        env (zod-validated), prisma client
│   │   │   ├── middleware/    auth + RBAC, error, request logger
│   │   │   ├── modules/       <domain>/<domain>.routes.ts · .service.ts · .schemas.ts
│   │   │   ├── routes/        v1 router composition
│   │   │   ├── services/      auth context, tenant access, activity log
│   │   │   ├── demo/seed/     deterministic demo data generator
│   │   │   ├── types/         AuthContext, Express augmentation
│   │   │   ├── utils/         http helpers, errors, sequences, IST time, logger
│   │   │   ├── app.ts · server.ts
│   │   └── tests/             vitest (unit + integration against carebridge_test)
│   └── web/                   ✅ React + Vite + TS + Tailwind; src/{api,components,config,data/demo,hooks,layouts,lib,pages,routes,store}
├── packages/shared/           roles · permissions · statuses · api types · demo accounts
├── docs/
├── docker-compose.yml         optional local PostgreSQL
└── package.json · pnpm-workspace.yaml · tsconfig.base.json
```

Controllers, repositories and validators live inside each module rather than in separate top-level folders. Each module is a single routes, service and schemas trio, so the extra layers would only add indirection (brief §87).

---

## 8. Demo data strategy

**Category A: database seed** (`apps/api/src/demo/seed`). This covers everything that takes part in a workflow.

- **Deterministic.** A fixed-seed PRNG (mulberry32) with no faker dependency, so every run produces the same people, catalogue and distribution.
- **Relative to now.** Appointments, orders and deliveries are placed relative to the seed time. Today's schedule, "available today" and active pharmacy orders always look current. Today's appointment statuses follow the clock: past slots are completed, near slots are waiting, later slots are confirmed.
- **Interconnected.** Orders use only medicines the chosen pharmacy stocks. Prescriptions come from completed consultations. Payments, deliveries, status histories, notifications and activity logs are all derived from the same events. Ratings are computed from approved reviews.
- **Volumes (ready mode):** 32 patients · 22 doctors (2 pending) · 12 specialties · 5 clinics · 3 hospitals · 7 pharmacies (incl. pending/rejected) · 12 categories · 73 medicines · ~105 appointments · ~55 consultations · ~47 prescriptions / ~100 items · 41 orders / ~100 items · ~160 payments · ~22 deliveries · ~70 reviews · ~175 notifications · ~575 activity logs · 17 lab tests · 14 lab bookings.
- **Reset.** Run `pnpm db:seed`, or call `POST /api/v1/demo/reset` as a platform admin. Reset is available only when `DEMO_MODE=true` and `NODE_ENV !== production`. It truncates and reseeds in about a second.

**Category B: frontend fixtures** (`apps/web/src/data/demo/`, Phase 6+). These cover hero banners, marketing copy, category illustrations and promotional blocks. They are kept separate from page components.

---

## 9. Golden demo scenario

| Role | Record |
|---|---|
| Patient | **Rahul Verma** (`patient@carebridge.demo`), Central District, preferred pharmacy City Care |
| Doctor | **Dr. Maya Rao** (`doctor@carebridge.demo`), Dermatologist, 12 yrs, ₹600, rating 4.8, Sunrise (primary) + Wellness (visiting) |
| Clinic | **Sunrise Family Clinic** (`clinic@carebridge.demo`) |
| Pharmacy | **City Care Pharmacy** (`pharmacy@carebridge.demo`), stocks every golden medicine |
| Prescription | **RX-2026-00125** |
| Order | **ORD-2026-0042** |

The starting state is set by `DEMO_SCENARIO_STATE`, or with `pnpm db:seed:complete` / `pnpm db:seed:ready`:

- **`ready`** (default, for live demos). Rahul has history with other doctors but no Maya appointment. Seeded prescriptions end at `…00124` and orders at `…0041`, so the prescription and order created live during the demo are exactly **RX-2026-00125** and **ORD-2026-0042**. Maya's **today 5:30 PM** Sunrise slot is kept free.
- **`complete`** (for walkthroughs without clicking). The full chain is pre-seeded: yesterday's Sunrise appointment, then consultation, then RX-2026-00125, then ORD-2026-0042 delivered by Arun Kumar. It is visible in the patient, doctor, clinic, pharmacy and admin portals.

The live prescription content (contact dermatitis: hydrocortisone cream, levocetirizine, moisturizer, calamine) is documented in `DEMO_GUIDE.md` for the presenter to type in. The application never suggests clinical content.

---

## 10. Development phases

| # | Phase | Status |
|---|---|---|
| 0 | Repository inspection | ✅ Empty repo; greenfield |
| 1 | Architecture & project structure | ✅ pnpm monorepo, shared package, API skeleton, docker-compose |
| 2 | Database schema | ✅ ~45 models, init migration with CHECK constraints |
| 3 | Authentication & RBAC | ✅ JWT auth, shared permission matrix, tenant service, tests |
| 4 | Seed/demo infrastructure | ✅ Deterministic seed, golden scenario modes, dev reset, invariant tests |
| 5 | Shared backend foundations | ✅ Query helpers (sort/boolean/csv), notification + mock document services, onboarding, search, reference data, tenant approval gate |
| 6 | Public/patient frontend foundation | ✅ Vite + React + TS + Tailwind, design tokens, shadcn-style primitives, TanStack Query, Zustand auth/cart stores, PublicLayout (header, global search, footer, mobile bottom nav), login (with demo-account buttons), register, forgot/reset password |
| 7 | Patient marketplace | ✅ Homepage (hero carousel, service cards, personalized banner, categories, doctors/orgs/pharmacies rows, why-CareBridge), doctor discovery + profile + real slot picker, clinic/hospital discovery + detail, pharmacy discovery + detail + "shop this pharmacy", medicine catalogue + category + detail, client-side cart (checkout arrives with orders in 11–12) |
| 8 | Appointments | ✅ Booking API (slot re-validation, partial unique index against double-booking, simulated payment, notifications, activity log, status history), patient booking page, appointment list + detail with timeline, cancel (with refund) and reschedule |
| 9 | Doctor portal | ✅ `DoctorLayout` (sidebar, pending-approval banner), dashboard (stat tiles, today's schedule, upcoming, recent patients), appointments list + detail with confirm/check-in/no-show/cancel/reschedule, patients list + detail (visit history), weekly availability editor (per clinic, breaks, slot length) + blocked dates, profile self-service (bio, specialties, fee, languages, consultation types, photo URL), notifications, login now routes doctors straight into the portal |
| 10 | Consultations & prescriptions | ✅ Consultation workspace (patient context, previous consultations/prescriptions, hand-typed notes/diagnosis/observations/follow-up), prescription builder over the medicine catalogue, draft → issue, printable prescription sheet for doctor and patient, patient prescription list/detail. Completing a visit closes the appointment, issues a leftover draft and settles a pay-at-clinic fee |
| 11 | Pharmacy marketplace | ✅ Prescription → ranked pharmacy availability → choose pharmacy → server cart; live prices/stock, quantity controls, remove/clear, pharmacy-mismatch confirmation, unmatched prescription lines. TanStack Query replaces the earlier Zustand cart |
| 12 | Orders & delivery | ✅ Checkout (saved/new address, delivery/pickup, prescription, fee breakdown, simulated payment), confirmation, patient order list/detail with timestamped tracking and cancellation; PharmacyLayout with scoped orders, prescription/stock/quantity/price review, accept/reject and preparation; simulated agent assignment and delivery progression, notifications and activity logs |
| 13 | Clinic/hospital portal | ✅ OrganizationLayout; dashboard; scoped doctors, appointments, patients, staff, services and schedules; reports; profile management |
| 14 | Admin portal | ✅ Overview, approvals, management, activity, reports, settings, charts |
| 15 | Lab tests & health records | ✅ Catalogue/packages, home collection booking and status, simulated payment/refund, aggregated health-record vault, mock upload |
| 16 | Cross-portal integration | ✅ Notifications; eligible patient reviews, admin moderation and rating recalculation; saved providers across cards, detail pages and favorites |
| 17 | UI polish | ✅ Loading/empty/error states, responsive, mobile nav, image fallbacks and demo navigation gaps |
| 18 | Testing | ✅ 206 API tests, 25 frontend tests, 19 browser tests; desktop/mobile booking-to-delivery, concurrent booking and delivery tenant isolation |
| 19 | Documentation | README, ARCHITECTURE, DATABASE, API, DEMO_GUIDE, RBAC, PRODUCTION_READINESS |
| 20 | Full demo verification | Golden flow end-to-end in the browser |

### Phase 11 verification

- Cart integration suite: **12/12 passed** against `carebridge_test`; full API suite: **135/135 passed across 12 files**, including all 123 earlier tests.
- Workspace `pnpm -r typecheck` and `pnpm -r build`: **passed**. PostgreSQL container `carebridge-postgres` is healthy on port 5433. Build/test commands ran outside the Windows sandbox after filesystem/Docker access restrictions.
- Fixed: adding to an emptied cart failed to restore its pharmacy, bypassing mismatch confirmation; repeated prescription medicine lines were undercounted in matching and could exceed stock when merged into the cart. Regression coverage also checks prescription ownership and draft rejection.
- Patient route: `/prescriptions/:id/pharmacies` leads to `/cart`. Shared cart additions are types only; no CommonJS runtime-export build error occurred.
- Non-blocking build warnings remain for dependency annotations and bundle size. Browser walkthrough was not performed in this verification pass.
- At the Phase 11 checkpoint, Proceed to Checkout was intentionally disabled. Phase 12 below enables it.

### Phase 12 implementation and verification

- Final API suite: **151/151 passed across 13 files**, including **16/16 new order tests** and all 135 prior tests. Tests actually ran against the separate PostgreSQL `carebridge_test` database; Docker container `carebridge-postgres` was reachable and healthy on port 5433.
- Final workspace `pnpm -r typecheck` and `pnpm -r build`: **passed**. No CommonJS runtime-export errors occurred. Only non-blocking dependency annotation and bundle-size warnings remain.
- Patient routes: `/checkout`, `/orders`, `/orders/:id`; checkout navigates to an order confirmation and tracking screen. The cart checkout button is enabled when stock is available.
- Pharmacy routes: `/pharmacy` → `/pharmacy/orders`, `/pharmacy/orders/:id`. Pharmacy login now opens its portal. Order processing and delivery controls share the order detail screen; broader inventory/profile/reporting features are not part of this phase.
- Payments remain entirely simulated. The previously planned payment routes did not exist at the start of Phase 12; order checkout follows the appointment payment pattern. Online demo payments are marked paid, cash settles on delivery/pickup, and cancellation/rejection marks paid payments refunded.
- Existing Prisma models were sufficient; **no schema change or migration** was needed. Delivery addresses are snapshotted; entering an address at checkout does not add it to the address book. Prescription-only medicines require a matching issued prescription belonging to the patient.
- Browser verification used installed Chrome and temporary API/frontend servers on ports 4001/5174 against `carebridge_test`: cart → checkout → confirmation → pharmacy confirmation/preparation → agent assignment → pickup → on the way → delivered → patient tracking. Desktop and 390px mobile passed with no browser/API errors. Fixed the shared mobile header overflowing by 7px.
- Focused coverage includes totals, stock rollback, concurrent checkout, address ownership, prescription review, full delivery and pickup chains, invalid transitions, partial approvals (including omitted lines), cancellation cutoff/refund, rejection, patient/pharmacy isolation, and duplicate-payment prevention.
- Real payment/refund gateways and logistics remain deliberately out of scope. New runtime UI status labels live in the web app; shared order additions are type-only DTOs.

### Phase 13 implementation and verification

- Added a responsive `OrganizationLayout` and role-protected `/organization/*` portal for clinic and hospital accounts. Login now takes organization users directly to their portal.
- The dashboard shows today's appointments, active doctors, total patients, completed consultations, lifetime completed-visit revenue, a seven-day appointment trend and today's doctor availability.
- Organization admins can update the public profile and operating hours; associate and activate/deactivate doctors; override consultation fees; add/deactivate staff; manage services; and replace each doctor's organization-specific weekly schedule. Staff retain read access to operations and appointment actions under the existing RBAC matrix.
- Appointments and patients are derived from the same records used by the patient and doctor portals. All organization API reads and writes resolve the authenticated membership and reject cross-tenant organization IDs.
- Reports accept a date range and summarize appointment outcomes, completed-visit revenue, daily activity and doctor performance.
- Verification: **160/160 API tests passed across 14 files**, including 9 new organization portal integration tests; workspace typecheck passed; the web production build passed with only the existing dependency annotation and bundle-size warnings.

### Phase 14 implementation and verification

- Added a responsive, role-protected `AdminLayout` and `/admin/*` workspace with navigation for overview, organizations, doctors, patients, pharmacies, appointments, orders, approvals, employees, reports, activity logs and settings. Employee and settings screens also enforce their individual permissions.
- The overview combines platform totals, pending approvals, registration and order trends, and recent registrations, appointments, orders and audit events. Reports accept a date range and summarize registrations, appointment outcomes, order volume, demo GMV, platform fees, daily activity and organization performance.
- Platform employees can search and inspect marketplace records, review mock onboarding documents, approve or reject providers, and see platform-wide appointments, orders and activity. Platform admins can additionally create organizations, activate/deactivate accounts and providers, create/edit employees, change platform roles and update validated settings. Super-admin accounts are protected from role and status changes.
- Replaced the provider-registration placeholder with doctor, clinic, hospital and pharmacy onboarding forms. Submissions use the existing authenticated onboarding flow, attach mock document metadata, enter pending approval and notify the review team.
- Verification: **167/167 API tests passed across 15 files**, including 7 new admin integration tests; workspace typecheck passed; API and web production builds passed. The web build retains the existing dependency annotation and bundle-size warnings.

### Phase 15 implementation and verification

- Replaced the lab placeholders with a public, searchable catalogue of the 17 seeded demo tests and packages. Detail pages show pricing, parameters, sample and fasting requirements, turnaround estimates and the tests included in each package.
- Patients can book demo home collection against a saved or newly entered address, choose a date and time slot, and use a simulated UPI or card payment. The API validates catalogue availability, date range and address ownership, calculates totals from database prices, creates notification/activity records and exposes booking status tracking. A booked collection can be cancelled once and its simulated payment is refunded.
- Added a patient-only Health Records page that combines issued prescriptions, consultations, appointment history, uploaded documents and generated lab reports. PDF/JPG/PNG mock uploads store validated metadata up to 10 MB; patients can list and delete their own uploads, while linked lab reports are protected.
- Existing Prisma models and seed data covered the phase, so no migration was required. Lab processing remains intentionally simulated and the UI clearly identifies demo reports and payments.
- Verification: **176/176 API tests passed across 16 files**, including 9 new lab and health-record integration tests; workspace typecheck passed; API and web production builds passed. The web build retains the existing dependency annotation and bundle-size warnings.

### Phase 16 implementation and verification

- Implemented `POST /reviews`, public approved-only `GET /reviews`, patient-scoped `GET /reviews?mine=true`, and `GET /reviews/eligibility`. Target filters accept a type and UUID. Ratings must be integers from 1–5 and written reviews are required (up to 4,000 characters).
- Doctor, clinic and hospital reviews require the patient's own completed appointment with that target; pharmacy reviews require their own delivered order. Pharmacies use the existing organization relationship. New reviews are always `PENDING`; patients see their existing pending/approved/rejected review instead of another form. Patient-row locking prevents concurrent duplicate submissions for a provider.
- Added the permission-protected `/admin/reviews` moderation page and list/approve/reject APIs. Moderation atomically recomputes the target's average and count using approved reviews only, including approval reversals and zero approved reviews. Provider-row locking serializes concurrent moderation; decisions are activity-logged. Public provider detail pages continue to exclude pending and rejected reviews.
- Implemented patient-scoped favorites list/add/remove APIs, idempotent adds, ownership-checked removal, save/unsave buttons on doctor and organization cards (including pharmacies) and all provider detail pages. Replaced the favorites placeholder with a patient-only saved-provider page linking to each provider.
- Existing notification integration remains in place. No schema migration was required. No Phase 17 work was undertaken in this implementation.
- Verification: **198/198 API tests across 17 files**, including **20 new engagement tests**; **17/17 web unit tests across 3 files**, including **6 review-form tests**; **14/14 Playwright tests**, including **4 full provider workflows** covering doctor, clinic, hospital and pharmacy. Workspace `pnpm -r typecheck` and `pnpm -r build` passed. The web build retains the existing dependency annotation and bundle-size warnings.
- API integration tests and browser tests use the isolated `carebridge_test` database. Playwright now migrates/seeds it, runs dedicated servers on ports 4001/5174, uses separate patient/admin browser sessions, and starts the API without a file watcher. Fixture creation/cleanup runs in an API-side process. Final browser run passed all 14 tests in 39.3 seconds.
- Final route inspection confirmed mounted POST handlers in `reviews/reviews.routes.ts` and `favorites/favorites.routes.ts`. HTTP integration tests received **201** responses and verified persisted records through subsequent reads; browser tests submitted reviews and saved/removed providers through the real API.

### Phase 17 implementation and verification

- Extended the broken-image fallback introduced for avatars to pharmacy and organization logos and medicine images: each now tracks a load failure and falls back to the existing gradient/icon placeholder instead of rendering a broken-image icon when the seeded URL 404s.
- Reviewed loading, empty and error states, dead-end screens and leftover placeholder copy across the patient, doctor, pharmacy, organization and admin portals; the existing skeleton/empty/error components were already applied consistently, so no further changes were required there.
- Verification: workspace typecheck passed; web Vitest suite passed (11/11).

### Phase 18 implementation and verification

- Added a concurrent appointment test proving two patients competing for the same slot receive one success and one conflict, with exactly one persisted appointment/payment and no charge for the loser. Added delivery mutation checks proving both another pharmacy and the patient receive 403 without changing delivery status/history.
- Added `golden-flow.spec.ts`: patient discovery/booking and simulated payment → doctor notes and catalogue prescription → consultation completion/automatic prescription issue → patient pharmacy selection/cart/checkout → pharmacy prescription review, preparation and delivery → patient tracking at every transition → admin visibility. All workflow mutations use UI controls and real APIs, with separate browser contexts for each role.
- The flow runs at 1440px and 390px, asserts complete timestamped order/delivery history, rejects browser runtime/API errors, checks horizontal overflow at checkpoints and saves screenshots. Visual review of booking, consultation, delivered-order and admin screenshots found a stale checkout banner on delivered orders; it now appears only while an order is pending, with a browser regression assertion.
- Added browser test/config TypeScript checking, the cached Node type dependency, `pnpm test:e2e`, and the sequential `pnpm test:phase18` gate. [TESTING.md](TESTING.md) contains the coverage map, environment requirements, commands and manual presenter checklist.
- Verification on 2026-09-28: `pnpm test:phase18` passed workspace typechecks/builds, **206/206 API tests across 18 files**, **25/25 frontend tests across 4 files**, and **19/19 Playwright tests**. After the screenshot-driven banner fix, web typecheck/build and **both golden-flow tests** passed again (57.3 seconds). Existing dependency-comment and bundle-size build warnings remain non-blocking.
- Integration/browser tests migrated and seeded only `carebridge_test` on local PostgreSQL port 5433; browser servers used ports 4001/5174. No schema migration was added. Verification used automated browser interactions plus manual screenshot inspection; a human presenter session and the broader Phase 20 demo sign-off remain separate.
