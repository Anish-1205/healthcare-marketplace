# API reference

Reviewed: 2026-09-29. Source: [routes/index.ts](../apps/api/src/routes/index.ts) registrations and each module's `*.routes.ts` file. All paths are mounted under `/api/v1` (see [app.ts](../apps/api/src/app.ts)). "Auth" states the middleware chain as written; "Ownership" notes are called out where the route comment or code states the permission check is OR'd across roles and record-level ownership is enforced in the service layer, per [ARCHITECTURE](ARCHITECTURE.md). Only endpoints actually registered in the router files are listed — nothing is inferred.

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | none | Runs `SELECT 1`; registered directly in [routes/index.ts](../apps/api/src/routes/index.ts). |

## Auth — [auth.routes.ts](../apps/api/src/modules/auth/auth.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/auth/register` | none |
| POST | `/auth/login` | none |
| POST | `/auth/logout` | authenticated |
| GET | `/auth/me` | authenticated |
| POST | `/auth/forgot-password` | none — see [SECURITY_AUDIT](SECURITY_AUDIT.md) S01 |
| POST | `/auth/reset-password` | none |

## Onboarding — [onboarding.routes.ts](../apps/api/src/modules/onboarding/onboarding.routes.ts)

Public provider registration; new providers start `PENDING_APPROVAL`.

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/onboarding/doctor` | none |
| POST | `/onboarding/organization` | none |

## Search — [search.routes.ts](../apps/api/src/modules/search/search.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/search?q=` | none |

## Notifications — [notifications.routes.ts](../apps/api/src/modules/notifications/notifications.routes.ts)

All queries scoped to the signed-in user.

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/notifications` | authenticated |
| GET | `/notifications/unread-count` | authenticated |
| POST | `/notifications/read-all` | authenticated |
| POST | `/notifications/:id/read` | authenticated (404 if not owned) |

## Demo — [demo.routes.ts](../apps/api/src/modules/demo/demo.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/demo/status` | none |
| GET | `/demo/accounts` | none, gated by `DEMO_MODE` (404 otherwise) |
| POST | `/demo/reset` | authenticated + `PERMISSIONS.DEMO_RESET`, additionally gated by `devToolsEnabled` (404 in production or when demo mode off); process-local mutex against concurrent resets |

## Doctors — [doctors.routes.ts](../apps/api/src/modules/doctors/doctors.routes.ts), [doctor-me.routes.ts](../apps/api/src/modules/doctors/doctor-me.routes.ts)

Public catalogue plus authenticated self-service, mounted at `/doctors/me/...` **before** the `/:id` catch-all so a literal `me` segment is never parsed as a doctor id.

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/doctors` | none |
| GET | `/doctors/:id/slots?date=` | none |
| GET | `/doctors/:id` | none |
| GET | `/doctors/me` | `DOCTOR_PROFILE_MANAGE` |
| PATCH | `/doctors/me` | `DOCTOR_PROFILE_MANAGE` |
| GET | `/doctors/me/availability` | `DOCTOR_AVAILABILITY_MANAGE` |
| PUT | `/doctors/me/availability` | `DOCTOR_AVAILABILITY_MANAGE` |
| POST | `/doctors/me/blocked-dates` | `DOCTOR_AVAILABILITY_MANAGE` |
| DELETE | `/doctors/me/blocked-dates/:id` | `DOCTOR_AVAILABILITY_MANAGE` |
| GET | `/doctors/me/dashboard` | `DOCTOR_PROFILE_MANAGE` |
| GET | `/doctors/me/patients` | `PATIENT_READ_ASSIGNED` |
| GET | `/doctors/me/patients/:patientId` | `PATIENT_READ_ASSIGNED` |

## Appointments — [appointments.routes.ts](../apps/api/src/modules/appointments/appointments.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/appointments` | one of `APPOINTMENT_READ_OWN`/`APPOINTMENT_READ_DOCTOR`/`APPOINTMENT_READ_ORGANIZATION` (ownership enforced in service) |
| POST | `/appointments` | `APPOINTMENT_BOOK` |
| GET | `/appointments/:id` | same as list |
| POST | `/appointments/:id/cancel` | one of `APPOINTMENT_BOOK`/`APPOINTMENT_MANAGE_DOCTOR`/`APPOINTMENT_MANAGE_ORGANIZATION` |
| POST | `/appointments/:id/reschedule` | same as cancel |
| POST | `/appointments/:id/status` | provider-side only: `APPOINTMENT_MANAGE_DOCTOR`/`APPOINTMENT_MANAGE_ORGANIZATION` |
| POST | `/appointments/:id/consultation` | `CONSULTATION_MANAGE` — opens/creates the consultation workspace |

## Consultations — [consultations.routes.ts](../apps/api/src/modules/consultations/consultations.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/consultations` | one of `CONSULTATION_MANAGE`/`PRESCRIPTION_READ_OWN`/`APPOINTMENT_READ_ORGANIZATION`/`ADMIN_DATA_READ` |
| GET | `/consultations/:id` | same |
| PATCH | `/consultations/:id` | `CONSULTATION_MANAGE` |
| POST | `/consultations/:id/complete` | `CONSULTATION_MANAGE` |

## Prescriptions — [prescriptions.routes.ts](../apps/api/src/modules/prescriptions/prescriptions.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/prescriptions` | one of `PRESCRIPTION_READ_OWN`/`PRESCRIPTION_CREATE`/`ORDER_READ_PHARMACY`/`APPOINTMENT_READ_ORGANIZATION`/`ADMIN_DATA_READ` |
| POST | `/prescriptions` | `PRESCRIPTION_CREATE` |
| GET | `/prescriptions/:id` | same as list |
| PATCH | `/prescriptions/:id` | `PRESCRIPTION_CREATE` |
| POST | `/prescriptions/:id/issue` | `PRESCRIPTION_CREATE` |
| GET | `/prescriptions/:id/pharmacies` | same as list |

## Organizations — [organizations.routes.ts](../apps/api/src/modules/organizations/organizations.routes.ts), [organization-me.routes.ts](../apps/api/src/modules/organizations/organization-me.routes.ts)

Public directory plus authenticated self-service at `/organizations/me/...`, selected by `?organizationId=` query param (`selectedOrganization` helper).

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/organizations` | none |
| GET | `/organizations/:id` | none |
| GET | `/organizations/me` | `APPOINTMENT_READ_ORGANIZATION` |
| PATCH | `/organizations/me` | `ORGANIZATION_PROFILE_MANAGE` |
| GET | `/organizations/me/dashboard` | `APPOINTMENT_READ_ORGANIZATION` |
| GET | `/organizations/me/doctors` | `APPOINTMENT_READ_ORGANIZATION` |
| POST | `/organizations/me/doctors` | `ORGANIZATION_DOCTOR_MANAGE` |
| PATCH | `/organizations/me/doctors/:id` | `ORGANIZATION_DOCTOR_MANAGE` |
| GET | `/organizations/me/staff` | `APPOINTMENT_READ_ORGANIZATION` |
| POST | `/organizations/me/staff` | `ORGANIZATION_STAFF_MANAGE` |
| PATCH | `/organizations/me/staff/:id` | `ORGANIZATION_STAFF_MANAGE` |
| GET | `/organizations/me/services` | `APPOINTMENT_READ_ORGANIZATION` |
| POST | `/organizations/me/services` | `ORGANIZATION_SERVICE_MANAGE` |
| PATCH | `/organizations/me/services/:id` | `ORGANIZATION_SERVICE_MANAGE` |
| GET | `/organizations/me/patients` | `PATIENT_READ_ORGANIZATION` |
| GET | `/organizations/me/schedules` | `APPOINTMENT_READ_ORGANIZATION` |
| PUT | `/organizations/me/doctors/:id/schedule` | `ORGANIZATION_DOCTOR_MANAGE` |
| GET | `/organizations/me/reports` | `ORGANIZATION_REPORT_READ` |

See [SECURITY_AUDIT](SECURITY_AUDIT.md) S03 for the finding that write methods here do not verify the selected membership's `staffRole` is `ADMIN`.

## Pharmacies — [pharmacies.routes.ts](../apps/api/src/modules/pharmacies/pharmacies.routes.ts)

Thin wrapper over the organizations service, filtered to `type: PHARMACY`.

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/pharmacies` | none |
| GET | `/pharmacies/:id` | none |

## Medicines — [medicines.routes.ts](../apps/api/src/modules/medicines/medicines.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/medicines` | none |
| GET | `/medicines/:id` | none |

## Cart — [cart.routes.ts](../apps/api/src/modules/cart/cart.routes.ts)

All routes require `CART_MANAGE`.

| Method | Path |
| --- | --- |
| GET | `/cart` |
| POST | `/cart/items` |
| PATCH | `/cart/items/:medicineId` |
| DELETE | `/cart/items/:medicineId` |
| DELETE | `/cart` |
| POST | `/cart/from-prescription` |

## Orders — [orders.routes.ts](../apps/api/src/modules/orders/orders.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/orders/checkout` | `ORDER_CREATE` |
| POST | `/orders` | `ORDER_CREATE` |
| GET | `/orders` | authenticated (ownership scoped in service) |
| GET | `/orders/:id` | authenticated |
| POST | `/orders/:id/cancel` | `ORDER_CREATE` |
| POST | `/orders/:id/status` | `ORDER_MANAGE_PHARMACY` |
| POST | `/orders/:id/delivery` | `DELIVERY_MANAGE` |

## Deliveries — [deliveries.routes.ts](../apps/api/src/modules/deliveries/deliveries.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/deliveries/:id/status` | `DELIVERY_MANAGE` |

## Payments — [payments.routes.ts](../apps/api/src/modules/payments/payments.routes.ts)

Simulated payments only — see [DATABASE_SCHEMA](DATABASE_SCHEMA.md) `Payment` model.

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/payments/simulate` | authenticated |
| GET | `/payments` | authenticated |

## Admin (platform) — [admin.routes.ts](../apps/api/src/modules/admin/admin.routes.ts)

All routes require `authenticate`; each also requires a specific permission (`readData` = `ADMIN_DATA_READ`, `readDashboard` = `ADMIN_DASHBOARD_READ`, etc.).

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/admin/reviews` | `REVIEW_MODERATE` |
| POST | `/admin/reviews/:id/approve` | `REVIEW_MODERATE` |
| POST | `/admin/reviews/:id/reject` | `REVIEW_MODERATE` |
| GET | `/admin/overview` | `ADMIN_DASHBOARD_READ` |
| GET | `/admin/organizations` | `ADMIN_DATA_READ` |
| POST | `/admin/organizations` | `ORGANIZATION_MANAGE` |
| GET | `/admin/organizations/:id` | `ADMIN_DATA_READ` |
| PATCH | `/admin/organizations/:id/status` | `ORGANIZATION_MANAGE` |
| GET | `/admin/doctors` | `ADMIN_DATA_READ` |
| GET | `/admin/doctors/:id` | `ADMIN_DATA_READ` |
| PATCH | `/admin/doctors/:id/status` | `USER_MANAGE` |
| GET | `/admin/patients` | `ADMIN_DATA_READ` |
| GET | `/admin/patients/:id` | `ADMIN_DATA_READ` |
| PATCH | `/admin/users/:id/status` | `USER_MANAGE` |
| GET | `/admin/appointments` | `ADMIN_DATA_READ` |
| GET | `/admin/orders` | `ADMIN_DATA_READ` |
| GET | `/admin/approvals` | `APPROVAL_MANAGE` |
| POST | `/admin/approvals/:type/:id/approve` | `APPROVAL_MANAGE` (`type` is `doctor` or `organization`) |
| POST | `/admin/approvals/:type/:id/reject` | `APPROVAL_MANAGE` |
| GET | `/admin/employees` | `ADMIN_DATA_READ` |
| POST | `/admin/employees` | `EMPLOYEE_MANAGE` |
| PATCH | `/admin/employees/:id` | `EMPLOYEE_MANAGE` |
| GET | `/admin/reports` | `ADMIN_DASHBOARD_READ` |
| GET | `/admin/activity` | `ACTIVITY_LOG_READ` |
| GET | `/admin/settings` | `ADMIN_DATA_READ` |
| PATCH | `/admin/settings` | `SETTINGS_MANAGE` |

## Labs — [labs.routes.ts](../apps/api/src/modules/labs/labs.routes.ts)

Three sub-routers mounted separately in [routes/index.ts](../apps/api/src/routes/index.ts).

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/lab-tests` | none |
| GET | `/lab-tests/categories` | none |
| GET | `/lab-tests/:id` | none |
| GET | `/lab-bookings/context` | `LAB_BOOKING_CREATE` |
| GET | `/lab-bookings` | `LAB_BOOKING_CREATE` |
| POST | `/lab-bookings` | `LAB_BOOKING_CREATE` |
| GET | `/lab-bookings/:id` | `LAB_BOOKING_CREATE` |
| POST | `/lab-bookings/:id/cancel` | `LAB_BOOKING_CREATE` |
| GET | `/health-records` | `HEALTH_RECORD_MANAGE_OWN` |
| GET | `/health-records/documents` | `HEALTH_RECORD_MANAGE_OWN` |
| POST | `/health-records/documents` | `HEALTH_RECORD_MANAGE_OWN` |
| DELETE | `/health-records/documents/:id` | `HEALTH_RECORD_MANAGE_OWN` |

## Reviews — [reviews.routes.ts](../apps/api/src/modules/reviews/reviews.routes.ts)

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/reviews` | authenticated, `review.create`; submissions always start `PENDING` |
| GET | `/reviews/eligibility` | authenticated, `review.create` |
| GET | `/reviews` | optional auth (`?mine=true` requires the caller to be identified) |

## Favorites — [favorites.routes.ts](../apps/api/src/modules/favorites/favorites.routes.ts)

All routes require `favorite.manage`.

| Method | Path |
| --- | --- |
| GET | `/favorites` |
| POST | `/favorites` (idempotent save) |
| DELETE | `/favorites/:id` |

## Profile — [profile.routes.ts](../apps/api/src/modules/profile/profile.routes.ts)

All routes require `patient.profile.manage`.

| Method | Path |
| --- | --- |
| GET | `/profile` |
| PATCH | `/profile` |
| GET | `/profile/addresses` |
| POST | `/profile/addresses` |
| PUT | `/profile/addresses/:id` |
| DELETE | `/profile/addresses/:id` |

## Reference — [reference.routes.ts](../apps/api/src/modules/reference/reference.routes.ts)

Mounted at root (`/`); public, no authentication.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/config` | Marketplace name, currency (`INR`), timezone, platform fee, default delivery fee, support email, disclaimer, `demoMode` — sourced from `PlatformSetting` with hardcoded fallbacks. |
| GET | `/specialties` | Includes `doctorCount` (approved + active doctors only). |
| GET | `/medicine-categories` | Includes `medicineCount` (active medicines only). |

## Permission constants

All `PERMISSIONS.*` values referenced above are defined once in [packages/shared/src/permissions.ts](../packages/shared/src/permissions.ts); see [DATABASE_SCHEMA](DATABASE_SCHEMA.md) `RolePermission` note and [DECISIONS_LOG](DECISIONS_LOG.md) for why the database table is not the runtime source of truth.
