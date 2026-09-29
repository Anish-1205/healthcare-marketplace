# Features

Reviewed: 2026-09-29. **Done** means the named demo capability has connected code, not production certification. **Partial** means concrete limitations remain. **Missing** means no implementation was found. Runtime behavior outside the checks in [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md) is **unverified**.

| Capability | Status | Evidence and limits |
| --- | --- | --- |
| Patient registration/login/current user | Done | `modules/auth`, auth pages/hooks; password hashing, JWT, database role reload |
| Logout and password recovery | Partial | Logout cannot revoke tokens; reset flow sends no email |
| Provider onboarding and approval | Done | `modules/onboarding`, admin approval routes, provider form; pending entities can sign in |
| Credential/license verification | Missing | User-entered details and document metadata only |
| Doctor directory and filters | Done | `modules/doctors`, doctor pages; specialties, fee, rating, language, locality, slots |
| Clinic/hospital/pharmacy directory | Done | `modules/organizations`, `pharmacies`; public lists/details |
| Medicine catalog and pharmacy prices | Done | `modules/medicines`; inventory prices/stock and filterable UI |
| Universal search | Done | `modules/search`; six capped result groups, debounced browser search |
| Live distance/geolocation | Missing | `Organization.distanceKm` is a stored mock distance |
| Appointment book/list/detail/cancel/reschedule | Done | `modules/appointments`, patient pages; history, payments and notifications |
| Booking concurrency guarantees | Partial | Equal doctor/start protected by SQL index; interval and patient races need further checks |
| Doctor dashboard/availability/blocked dates/profile | Done | `doctor-me` routes/services and doctor pages |
| Assigned patient history | Done | Doctor service checks and patient list/detail pages |
| Consultation workspace and manual notes | Done | `modules/consultations`, consultation workspace |
| Draft/edit/issue/print prescriptions | Done | `modules/prescriptions`, prescription builder; browser print |
| Automated diagnosis or prescribing | Missing | Clinical fields are deliberately entered manually |
| Video/phone transport | Missing | Consultation-type metadata exists; no media/calling integration |
| Prescription pharmacy matching/cart conversion | Done | Prescription/cart services report unmatched lines |
| Prescription expiry/refill/quantity enforcement | Partial | Validity stored; checkout checks ownership, status and medicine coverage, not expiry/cumulative dispensing |
| Single-pharmacy cart and checkout | Done | Server totals, stock reservation, saved/inline address, cart locking |
| Pharmacy review and processing | Done | Order pages and routes; approved quantities/prices may only decrease |
| Pharmacy inventory/catalog management | Missing | Inventory read/decrement/restore exists; no management router/page |
| Payment/refund integration | Partial | Simulated states; no gateway, webhook, reconciliation or actual refund |
| Delivery tracking | Partial | Fixed demo agent and manual state progression; no logistics/GPS |
| Organization portal | Done | Profile, doctors, staff, services, schedules, patients, dashboard, reports |
| Tenant-specific administrator enforcement | Partial | Global permissions and memberships exist; see security S03 |
| Platform portal | Done | Entities, transactions, approvals, employees, settings, activity and review moderation |
| Audit trail | Partial | Many actions logged; some mutations/read access lack logs; no tamper-evident retention |
| Lab catalog/packages and patient booking/cancel | Done | `modules/labs`, schemas and pages |
| Lab operations and real report ingestion | Missing | No lab operator portal or progression/report ingestion route; later states are seeded |
| Health record vault | Partial | Clinical history aggregation and metadata CRUD; file bytes not stored |
| Patient profiles and saved addresses | Done | `modules/profile`, profile/address pages; lab address history not snapshotted |
| Favorites and reviews | Done | Usage eligibility, pending reviews, moderation and ratings; lists unbounded |
| In-app notifications | Done | User-scoped list/read/read-all, unread count polling |
| Email/SMS/push/reminder scheduler | Missing | No transport or background reminder worker found |
| About/contact/privacy/terms | Done | Static demo text; no contact-ticket backend |
| Responsive browser layouts | Done | Tailwind breakpoints/mobile navigation; full accessibility audit **unverified** |
| Native mobile app | Missing | Home advertises a future app; no native project |
| Reproducible demo scenarios | Done | Ready/complete scenarios and linked fixture data; destructive seed |
| Automated checks | Partial | API, frontend and Playwright suites exist; fresh DB/browser-suite execution **unverified** |
| Production operations | Missing | No application deploy pipeline, monitoring backend, backup/recovery automation found |

Evidence: [API_REFERENCE](API_REFERENCE.md), [FILE_MAP](FILE_MAP.md), [DATABASE_SCHEMA](DATABASE_SCHEMA.md). Missing capabilities are gaps against the named real-world behavior, not a claim that all were required by the original specification.
