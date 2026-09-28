# API reference

Base URL: `http://localhost:4000/api/v1` in development. Routes below were checked against `apps/api/src/routes/index.ts` and the mounted `*.routes.ts` modules. Use `Authorization: Bearer <token>` for private routes; roles and record ownership are enforced separately. JSON success is `{ "success": true, "data": ... }`; paginated lists also include `meta: { page, pageSize, total, totalPages }`. Errors use `{ "success": false, "error": { "code", "message", "details"? } }`. `POST` creates return 201; other successful operations generally return 200.

| Area | Implemented endpoints | Access |
|---|---|---|
| Health/reference | `GET /health`, `/config`, `/specialties`, `/medicine-categories` | Public |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me`; `POST /auth/logout` | `me`/logout require login |
| Discovery | `GET /search`, `/doctors`, `/doctors/:id`, `/doctors/:id/slots`, `/organizations`, `/organizations/:id`, `/pharmacies`, `/pharmacies/:id`, `/medicines`, `/medicines/:id` | Public |
| Onboarding | `POST /onboarding/doctor`, `/onboarding/organization` | Public; newly created providers await approval |
| Patient profile | `GET, PATCH /profile`; `GET, POST /profile/addresses`; `PUT, DELETE /profile/addresses/:id` | Patient |
| Appointments | `GET, POST /appointments`; `GET /appointments/:id`; `POST /appointments/:id/cancel`, `/appointments/:id/reschedule`, `/appointments/:id/status`, `/appointments/:id/consultation` | Book as patient; status/consultation as provider; reads/actions scoped |
| Consultations | `GET /consultations`, `/consultations/:id`; `PATCH /consultations/:id`; `POST /consultations/:id/complete` | Scoped; treating doctor writes |
| Prescriptions | `GET, POST /prescriptions`; `GET, PATCH /prescriptions/:id`; `POST /prescriptions/:id/issue`; `GET /prescriptions/:id/pharmacies` | Scoped; treating doctor creates/edits/issues |
| Doctor workspace | `GET, PATCH /doctors/me`; `GET, PUT /doctors/me/availability`; `POST /doctors/me/blocked-dates`; `DELETE /doctors/me/blocked-dates/:id`; `GET /doctors/me/dashboard`, `/doctors/me/patients`, `/doctors/me/patients/:patientId` | Doctor |
| Organization workspace | `GET, PATCH /organizations/me`; `GET /organizations/me/dashboard`, `/doctors`, `/staff`, `/services`, `/patients`, `/schedules`, `/reports`; `POST /organizations/me/doctors`, `/staff`, `/services`; `PATCH /organizations/me/doctors/:id`, `/staff/:id`, `/services/:id`; `PUT /organizations/me/doctors/:id/schedule` | Clinic/hospital membership; writes require admin rights |
| Cart | `GET, DELETE /cart`; `POST /cart/items`, `/cart/from-prescription`; `PATCH, DELETE /cart/items/:medicineId` | Patient |
| Orders/payments | `GET /orders/checkout`, `/orders`, `/orders/:id`, `/payments`; `POST /orders`, `/orders/:id/cancel`, `/orders/:id/status`, `/orders/:id/delivery`, `/payments/simulate` | Patient checkout/cancel; pharmacy status/delivery; scoped reads; simulated payment |
| Delivery | `POST /deliveries/:id/status` | Owning pharmacy |
| Lab/records | `GET /lab-tests`, `/lab-tests/categories`, `/lab-tests/:id`; `GET /lab-bookings/context`, `/lab-bookings`, `/lab-bookings/:id`; `POST /lab-bookings`, `/lab-bookings/:id/cancel`; `GET /health-records`, `/health-records/documents`; `POST /health-records/documents`; `DELETE /health-records/documents/:id` | Lab catalog public; booking/records patient-scoped; document upload stores metadata |
| Engagement | `GET /reviews`, `/reviews/eligibility`, `/favorites`; `POST /reviews`, `/favorites`; `DELETE /favorites/:id` | Approved reviews public; eligibility/submission/favorites patient-scoped |
| Notifications | `GET /notifications`, `/notifications/unread-count`; `POST /notifications/read-all`, `/notifications/:id/read` | Signed-in user, own notifications |
| Demo | `GET /demo/status`, `/demo/accounts`; `POST /demo/reset` | Accounts require `DEMO_MODE`; reset requires admin permission and non-production demo mode |

Platform routes, all under `/admin`:

| Read | Write |
|---|---|
| `GET /overview`, `/organizations`, `/organizations/:id`, `/doctors`, `/doctors/:id`, `/patients`, `/patients/:id`, `/appointments`, `/orders`, `/approvals`, `/employees`, `/reports`, `/activity`, `/settings`, `/reviews` | `POST /organizations`, `/employees`, `/approvals/:type/:id/approve`, `/approvals/:type/:id/reject`, `/reviews/:id/approve`, `/reviews/:id/reject`; `PATCH /organizations/:id/status`, `/doctors/:id/status`, `/users/:id/status`, `/employees/:id`, `/settings` |

The platform employee role can read data, moderate reviews, and decide approvals; user/organization/employee/settings mutations require platform admin rights. List endpoints use `page`/`pageSize` where supported. Zod schemas in each module are the source for exact request fields and filters; common examples are `GET /doctors/:id/slots?date=YYYY-MM-DD`, `POST /appointments` with an offered `scheduledStart`, and `POST /orders` with `fulfillmentType`, `paymentMethod`, and a delivery address or `addressId`. Order totals and medicine prices are calculated server-side. Payments and delivery remain simulated.
