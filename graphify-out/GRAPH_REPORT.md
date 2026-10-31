# Graph Report - healthcare-marketplace  (2026-10-31)

## Corpus Check
- 370 files · ~233,404 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .example 2, .toml 1)

## Summary
- 2034 nodes · 7527 edges · 96 communities (89 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.85)
- Token cost: 15,118 input · 6,078 output

## Community Hubs (Navigation)
- Authentication
- Platform Admin
- Doctors
- Platform Admin
- RBAC Permissions
- Doctors
- Labs and Records
- Doctors
- Status Models
- Demo Seed
- Authentication
- Portal Layouts
- Prescriptions
- Doctors
- API Tests
- Authentication
- Organizations
- Doctors
- Cart and Checkout
- Prescriptions
- Platform Admin
- Doctors
- Delivery
- Authentication
- Patient Profiles
- Organizations
- Organizations
- web package json
- Labs and Records
- Search
- Orders
- Prescriptions
- Authentication
- Demo Seed
- app ts
- Appointments
- Doctors
- Doctors
- Cart and Checkout
- Cart and Checkout
- Demo Seed
- Reviews
- Doctors
- Patient Profiles
- Platform Admin
- Demo Seed
- Search
- Browser Tests
- docker compose yml
- devDependencies Module
- API Tests
- Appointments
- Orders
- web tsconfig json
- dependencies Module
- Demo Seed
- Demo Seed
- Organizations
- Prescriptions
- Portal Layouts
- Prescriptions
- shared package json
- Doctors
- Browser Tests
- Organizations
- Organizations
- tsconfig base json
- Demo Seed
- api tsconfig json
- Appointments
- Orders
- Browser Tests
- shared tsconfig json
- Cart and Checkout
- Consultations
- Search
- Organizations
- Medicine Catalog
- API Tests
- Reviews
- Provider Onboarding
- Organizations
- sequence ts
- Authentication
- Authentication
- Consultations
- Orders
- personalized banner tsx
- tsconfig build json
- Authentication
- vite env d
- pnpm workspace yaml
- types supertest 6
- Cross Portal Data

## God Nodes (most connected - your core abstractions)
1. `Skeleton()` - 126 edges
2. `ErrorState()` - 123 edges
3. `Button` - 109 edges
4. `cn()` - 107 edges
5. `PageHeader()` - 92 edges
6. `lucide-react` - 91 edges
7. `Badge()` - 85 edges
8. `react-router-dom` - 82 edges
9. `react` - 77 edges
10. `EmptyState()` - 74 edges

## Surprising Connections (you probably didn't know these)
- `WindowDraft` --references--> `ConsultationType`  [EXTRACTED]
  apps/web/src/pages/doctor/doctor-availability-page.tsx → packages/shared/src/statuses.ts
- `AccessTokenPayload` --references--> `Role`  [EXTRACTED]
  apps/api/src/modules/auth/token.ts → packages/shared/src/roles.ts
- `startConsultation()` --calls--> `canTransition()`  [EXTRACTED]
  apps/api/src/modules/consultations/consultations.service.ts → packages/shared/src/statuses.ts
- `LoadedAuth` --references--> `AuthUser`  [EXTRACTED]
  apps/api/src/services/auth-context.service.ts → packages/shared/src/api.ts
- `OrganizationAccessOptions` --references--> `OrganizationType`  [EXTRACTED]
  apps/api/src/services/tenant.service.ts → packages/shared/src/statuses.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **End-to-End Care and Commerce Journey** — docs_architecture_booking_to_delivery_flow, docs_demo_guide_golden_demo, docs_demo_verification_phase_20, docs_testing_verification_strategy [EXTRACTED 1.00]
- **Production Gating Evidence Chain** — docs_security_audit_security_findings, docs_code_quality_audit_quality_findings, docs_performance_audit_performance_findings, docs_tech_debt_and_todo_prioritized_backlog, docs_production_readiness_release_gate [EXTRACTED 1.00]
- **CareBridge Portal Ecosystem** — master_prompt_patient_marketplace, master_prompt_doctor_portal, master_prompt_pharmacy_marketplace [EXTRACTED 1.00]

## Communities (96 total, 7 thin omitted)

### Community 0 - "Authentication"
Cohesion: 0.11
Nodes (34): ApiError, AuthShell(), badgeVariants, Button, ButtonProps, Input, Label, useOrganizationProfile() (+26 more)

### Community 1 - "Platform Admin"
Cohesion: 0.11
Nodes (54): axis, CHART_COLORS, ChartSeries, ChartTooltip(), Legend(), StatCard(), TrendAreaChart(), TrendBarChart() (+46 more)

### Community 2 - "Doctors"
Cohesion: 0.12
Nodes (40): EmptyState(), ErrorState(), PageHeader(), Avatar(), Badge(), Skeleton(), useCartFromPrescription(), useUpdateDoctorProfile() (+32 more)

### Community 3 - "Platform Admin"
Cohesion: 0.08
Nodes (46): activityDto(), activityInclude, ActivityRow, appointmentDto(), AppointmentRow, appointmentSelect, approvalDocuments(), createEmployee() (+38 more)

### Community 4 - "RBAC Permissions"
Cohesion: 0.07
Nodes (38): AccessTokenPayload, authUserInclude, buildContext(), findAuthUser(), loadAuth(), LoadedAuth, LoadedUser, assertOrganizationAccess() (+30 more)

### Community 5 - "Doctors"
Cohesion: 0.11
Nodes (37): SpecialtyRef, CategoryCard(), SURFACE_CLASS, cardRise, CountUp(), fadeUp, Reveal(), spring (+29 more)

### Community 6 - "Labs and Records"
Cohesion: 0.08
Nodes (40): CreateLabBookingInput, createLabBookingSchema, labTestParamSchema, ListHealthDocumentsInput, listHealthDocumentsSchema, ListLabBookingsInput, listLabBookingsSchema, ListLabTestsInput (+32 more)

### Community 7 - "Doctors"
Cohesion: 0.16
Nodes (22): AppointmentCard(), Pagination(), Select, useAppointments(), useSpecialties(), AppointmentsPage(), TABS, DoctorAppointmentsPage() (+14 more)

### Community 8 - "Status Models"
Cohesion: 0.08
Nodes (39): Paginated, LabBookingParams, labsApi, LabTestParams, AdminAppointment, DocumentMimeType, ACTIVE_APPOINTMENT_STATUSES, APPOINTMENT_PAYMENT_METHODS (+31 more)

### Community 9 - "Demo Seed"
Cohesion: 0.07
Nodes (36): CLINICAL_TEMPLATES, ClinicalTemplate, GOLDEN_CONSULTATION, PrescriptionLineSeed, AvailabilityWindow, CANCEL_REASONS, DOCTOR_REVIEW_COMMENTS, InventoryEntry (+28 more)

### Community 10 - "Authentication"
Cohesion: 0.13
Nodes (35): Tx, requireRoles(), listSettings(), moderateReview(), updateSettings(), updateUserStatus(), assertEmailAvailable(), getCurrentUser() (+27 more)

### Community 11 - "Portal Layouts"
Cohesion: 0.14
Nodes (31): Header(), HeaderIconLink(), MobileNav(), NAV_LINKS, NavItem(), NotificationBell(), PATIENT_LINKS, ProfileMenu() (+23 more)

### Community 12 - "Prescriptions"
Cohesion: 0.08
Nodes (33): consultationsApi, ListConsultationsParams, ListPrescriptionsParams, prescriptionsApi, useCompleteConsultation(), useConsultation(), useConsultationMutation(), useConsultations() (+25 more)

### Community 13 - "Doctors"
Cohesion: 0.12
Nodes (22): TYPE_ICON, AppointmentStatusBadge(), STATUS_VARIANT, DoctorAppointmentRow(), QUICK_ACTIONS, TYPE_ICON, AvatarProps, SIZE_CLASSES (+14 more)

### Community 14 - "API Tests"
Cohesion: 0.18
Nodes (20): globalForPrisma, prisma, book(), findSlots(), Slot, findSlot(), issuePrescriptionForPatient(), Slot (+12 more)

### Community 15 - "Authentication"
Cohesion: 0.08
Nodes (28): authRouter, emailSchema, forgotPasswordSchema, LoginInput, loginSchema, passwordSchema, personNameSchema, phoneSchema (+20 more)

### Community 16 - "Organizations"
Cohesion: 0.17
Nodes (23): DoctorCard(), FavoriteButton(), RevealCard(), OrganizationCard(), PatientReview(), mocks, render(), RatingStars() (+15 more)

### Community 17 - "Doctors"
Cohesion: 0.14
Nodes (25): demoRouter, resetSchema, canManageAvailability, canManageProfile, canReadPatients, doctorMeRouter, doctorsRouter, slotsQuery (+17 more)

### Community 18 - "Cart and Checkout"
Cohesion: 0.15
Nodes (29): addCartItem(), buildCartFromPrescription(), cartInclude, CartRow, clearCart(), getCart(), mapPharmacy(), removeCartItem() (+21 more)

### Community 19 - "Prescriptions"
Cohesion: 0.16
Nodes (30): assertTreatingDoctor(), canView(), completeConsultation(), consultationInclude, ConsultationRow, findOrThrow(), getConsultation(), listConsultations() (+22 more)

### Community 20 - "Platform Admin"
Cohesion: 0.09
Nodes (29): adminRouter, manageApprovals, manageEmployees, manageOrganizations, manageSettings, manageUsers, readActivity, readDashboard (+21 more)

### Community 21 - "Doctors"
Cohesion: 0.11
Nodes (30): appointmentInclude, AvailabilityWindowInput, availabilityWindowSchema, BlockedDateInput, blockedDateSchema, ListMyPatientsQuery, ReplaceAvailabilityInput, replaceAvailabilitySchema (+22 more)

### Community 22 - "Delivery"
Cohesion: 0.08
Nodes (26): Web SPA HTML Entry, CareBridge API Surface, Registered API Routes, Booking-to-Delivery Domain Flow, Modular Monolith Architecture, Shared TypeScript RBAC Matrix, Domain Module Conventions, CareBridge Persistence Model (+18 more)

### Community 23 - "Authentication"
Cohesion: 0.12
Nodes (19): authApi, LoginPayload, RegisterPatientPayload, NotificationDto, notificationsApi, queryClient, App(), AuthBootstrap() (+11 more)

### Community 24 - "Patient Profiles"
Cohesion: 0.11
Nodes (21): useMarkAllNotificationsRead(), useMarkNotificationRead(), useAddresses(), useDeleteAddress(), useProfile(), useSaveAddress(), useUpdateProfile(), AdminReviewsPage() (+13 more)

### Community 25 - "Organizations"
Cohesion: 0.09
Nodes (26): canManageDoctors, canManageProfile, canManageServices, canManageStaff, canRead, canReadReports, organizationMeRouter, selectedOrganization() (+18 more)

### Community 26 - "Organizations"
Cohesion: 0.14
Nodes (28): associateDoctor(), createService(), createStaff(), dayLabel(), doctorDto(), doctorInclude, DoctorLinkRow, getDashboard() (+20 more)

### Community 27 - "web package json"
Cohesion: 0.10
Nodes (27): devDependencies, autoprefixer@^10.4.20, jsdom@^26.1.0, postcss@^8.4.49, tailwindcss@^3.4.17, tailwindcss-animate@^1.0.7, @types/node@^24.0.0, @types/react@^18.3.17 (+19 more)

### Community 28 - "Labs and Records"
Cohesion: 0.14
Nodes (23): useBookLabTest(), useCancelLabBooking(), useDeleteHealthDocument(), useHealthRecords(), useLabBooking(), useLabBookingContext(), useLabBookings(), useLabInvalidation() (+15 more)

### Community 29 - "Search"
Cohesion: 0.11
Nodes (16): api, ListOrganizationsParams, organizationsApi, ListPharmaciesParams, pharmaciesApi, MedicineCategoryRef, referenceApi, GlobalSearch() (+8 more)

### Community 30 - "Orders"
Cohesion: 0.21
Nodes (23): assignDelivery(), updateDelivery(), allowed(), assertManage(), assertView(), cancellable, cancelOrder(), changeStatus() (+15 more)

### Community 31 - "Prescriptions"
Cohesion: 0.15
Nodes (17): canRead, canWrite, prescriptionsRouter, CreatePrescriptionInput, createPrescriptionSchema, ListPrescriptionsQuery, PrescriptionItemInput, prescriptionItemSchema (+9 more)

### Community 32 - "Authentication"
Cohesion: 0.08
Nodes (26): dependencies, @carebridge/shared@workspace:*, class-variance-authority@^0.7.1, clsx@^2.1.1, @hookform/resolvers@^3.9.1, lucide-react@^0.469.0, motion@12.23.12, react@^18.3.1 (+18 more)

### Community 33 - "Demo Seed"
Cohesion: 0.08
Nodes (25): description, engines, node, name, packageManager, private, scripts, build (+17 more)

### Community 34 - "app ts"
Cohesion: 0.15
Nodes (18): createApp(), booleanFromString, devToolsEnabled, env, envSchema, isProduction, parsed, errorHandler() (+10 more)

### Community 35 - "Appointments"
Cohesion: 0.21
Nodes (23): decideApproval(), AppointmentRow, AppointmentRowWithHistory, assertCanView(), assertNoPatientClash(), bookAppointment(), cancelAppointment(), canView() (+15 more)

### Community 36 - "Doctors"
Cohesion: 0.18
Nodes (16): doctorsApi, ListDoctorsParams, nextDays(), SlotPicker(), render(), TYPE_META, useBookAppointment(), useDoctor() (+8 more)

### Community 37 - "Doctors"
Cohesion: 0.17
Nodes (20): useAddBlockedDate(), useDoctorAvailability(), useDoctorDashboard(), useDoctorPatient(), useDoctorPatients(), useDoctorProfile(), useInvalidateAvailability(), useIsDoctor() (+12 more)

### Community 38 - "Cart and Checkout"
Cohesion: 0.15
Nodes (18): cartApi, AdminOrder, CartDetail, CartFromPrescriptionPayload, CartFromPrescriptionResult, CartItemDetail, CartPharmacyRef, PrescriptionPharmacyMatch (+10 more)

### Community 39 - "Cart and Checkout"
Cohesion: 0.24
Nodes (14): MedicineCard(), QuantityStepper(), PharmacyConflict, useAddToCart(), addToCart(), useAddCartItem(), useCart(), useCartMutation() (+6 more)

### Community 40 - "Demo Seed"
Cohesion: 0.15
Nodes (10): chunk(), dateKey(), fromMinutes(), fullName(), seedDatabase(), toMinutes(), truncateAll(), Random (+2 more)

### Community 41 - "Reviews"
Cohesion: 0.19
Nodes (15): authenticate(), bearerToken(), getAuth(), optionalAuth(), requirePermission(), resolveAuth(), verifyAccessToken(), favoritesRouter (+7 more)

### Community 42 - "Doctors"
Cohesion: 0.15
Nodes (18): doctorPortalApi, ListMyPatientsParams, AppointmentDetail, AppointmentSummary, DoctorOrganizationLink, ReviewSummary, DOCTOR_SETTABLE_STATUSES, DoctorAvailabilityState (+10 more)

### Community 43 - "Patient Profiles"
Cohesion: 0.15
Nodes (15): ListMedicinesParams, medicinesApi, AddressPayload, profileApi, UpdateProfilePayload, DoctorAvailabilityWindow, Gender, MedicineDetail (+7 more)

### Community 44 - "Platform Admin"
Cohesion: 0.21
Nodes (17): OrganizationAccessOptions, adminApi, AdminListParams, AdminActivity, AdminApproval, AdminDoctor, AdminOrganization, AdminOverview (+9 more)

### Community 45 - "Demo Seed"
Cohesion: 0.11
Nodes (17): ALL_DAYS, ALL_TYPES, DOCTORS, DoctorSeed, GOLDEN_PATIENT, MON_SAT, ORGANIZATIONS, OrganizationSeed (+9 more)

### Community 46 - "Search"
Cohesion: 0.14
Nodes (14): referenceRouter, PLATFORM_TIMEZONE, ApiFailure, ApiResponse, ApiSuccess, DEFAULT_PAGE_SIZE, DEMO_DISCLAIMER, DemoAccount (+6 more)

### Community 47 - "Browser Tests"
Cohesion: 0.17
Nodes (7): API_PORT, API_URL, WEB_PORT, WEB_URL, Slot, @playwright/test@^1.63.0, @playwright/test

### Community 48 - "docker compose yml"
Cohesion: 0.11
Nodes (17): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, interval, retries, test, timeout, container_name (+9 more)

### Community 49 - "devDependencies Module"
Cohesion: 0.12
Nodes (16): devDependencies, prisma@^6.19.0, supertest@^7.1.0, tsx@^4.20.0, @types/cors@^2.8.19, @types/express@^5.0.3, @types/jsonwebtoken@^9.0.10, typescript@^5.9.0 (+8 more)

### Community 50 - "API Tests"
Cohesion: 0.18
Nodes (8): main(), ScenarioState, db, input, globalSetup(), applyTestEnv(), TEST_DATABASE_URL, @prisma/client

### Community 51 - "Appointments"
Cohesion: 0.17
Nodes (14): appointmentsRouter, canManage, canRead, canUpdateStatus, BookAppointmentInput, bookAppointmentSchema, CancelAppointmentInput, cancelAppointmentSchema (+6 more)

### Community 52 - "Orders"
Cohesion: 0.17
Nodes (12): deliveriesRouter, assignDeliverySchema, deliveryStatusSchema, ordersRouter, address, cancelSchema, CheckoutInput, checkoutSchema (+4 more)

### Community 53 - "web tsconfig json"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 54 - "dependencies Module"
Cohesion: 0.13
Nodes (15): dependencies, bcryptjs@^3.0.2, @carebridge/shared@workspace:*, dotenv@^17.2.0, express@^5.1.0, helmet@^8.1.0, jsonwebtoken@^9.0.2, @prisma/client@^6.19.0 (+7 more)

### Community 55 - "Demo Seed"
Cohesion: 0.13
Nodes (15): scripts, build, db:deploy, db:generate, db:migrate, db:reset, db:seed, db:seed:complete (+7 more)

### Community 56 - "Demo Seed"
Cohesion: 0.32
Nodes (12): dateKey(), DoctorScheduleData, fromMinutes(), getNextAvailableSlot(), getSlotsForDate(), loadSchedule(), slotsForDay(), toMinutes() (+4 more)

### Community 57 - "Organizations"
Cohesion: 0.25
Nodes (13): AssociateDoctorPayload, CreateOrganizationStaffPayload, OrganizationDoctor, OrganizationPatient, OrganizationReport, OrganizationScheduleWindow, OrganizationScheduleWindowInput, OrganizationServiceRecord (+5 more)

### Community 58 - "Prescriptions"
Cohesion: 0.20
Nodes (12): emptyLine(), MedicinePicker(), PrescriptionBuilder(), addLine(), lineIsComplete(), persist(), removeLine(), SuggestionRow() (+4 more)

### Community 59 - "Portal Layouts"
Cohesion: 0.19
Nodes (10): Footer(), SOCIAL_LINKS, ITEMS, MobileBottomNav(), ICONS, SURFACE_CLASS, FOOTER_LINKS, PRIMARY_SERVICES (+2 more)

### Community 60 - "Prescriptions"
Cohesion: 0.29
Nodes (9): buttonVariants, useIssuePrescription(), usePrescription(), ComingSoonPage(), DoctorPrescriptionDetailPage(), NotFoundPage(), CheckoutPage(), PrescriptionDetailPage() (+1 more)

### Community 61 - "shared package json"
Cohesion: 0.15
Nodes (13): description, devDependencies, typescript@^5.9.0, files, typescript, main, name, private (+5 more)

### Community 62 - "Doctors"
Cohesion: 0.22
Nodes (12): ListDoctorsQuery, DoctorRow, findDoctorRow(), getDoctorDetail(), getDoctorSlots(), isUuidLike(), listDoctors(), listedDoctor (+4 more)

### Community 63 - "Browser Tests"
Cohesion: 0.18
Nodes (3): requireApi, vite@^6.0.5, vite

### Community 64 - "Organizations"
Cohesion: 0.26
Nodes (11): ListOrganizationsQuery, getOrganizationDetail(), isUuidLike(), listed, listOrganizations(), openStatus(), OrganizationRow, summarySelect (+3 more)

### Community 65 - "Organizations"
Cohesion: 0.29
Nodes (11): organizationPortalApi, key, useAssociateOrganizationDoctor(), useCreateOrganizationService(), useCreateOrganizationStaff(), useInvalidate(), useReplaceOrganizationSchedule(), useUpdateOrganizationDoctor() (+3 more)

### Community 66 - "tsconfig base json"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, noFallthroughCasesInSwitch, noImplicitReturns, resolveJsonModule, skipLibCheck (+3 more)

### Community 67 - "Demo Seed"
Cohesion: 0.18
Nodes (10): cors@^2.8.5, @types/node@^24.0.0, @types/node, main, name, prisma, seed, private (+2 more)

### Community 68 - "api tsconfig json"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, rootDir, types, extends, include (+1 more)

### Community 69 - "Appointments"
Cohesion: 0.36
Nodes (7): appointmentsApi, ListAppointmentsParams, AppointmentScope, BookAppointmentPayload, CancelAppointmentPayload, RescheduleAppointmentPayload, UpdateAppointmentStatusPayload

### Community 70 - "Orders"
Cohesion: 0.38
Nodes (6): ordersApi, DELIVERY_LABELS, DELIVERY_NEXT, ORDER_LABELS, orderTime(), OrderDetailPage()

### Community 71 - "Browser Tests"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, module, moduleResolution, noEmit, types, extends, include (+1 more)

### Community 72 - "shared tsconfig json"
Cohesion: 0.20
Nodes (9): compilerOptions, declaration, module, moduleResolution, outDir, rootDir, extends, include (+1 more)

### Community 73 - "Cart and Checkout"
Cohesion: 0.31
Nodes (7): cartRouter, AddCartItemInput, addCartItemSchema, CartFromPrescriptionInput, cartFromPrescriptionSchema, UpdateCartItemInput, updateCartItemSchema

### Community 74 - "Consultations"
Cohesion: 0.28
Nodes (6): canRead, canWrite, consultationsRouter, ListConsultationsQuery, UpdateConsultationInput, updateConsultationSchema

### Community 75 - "Search"
Cohesion: 0.47
Nodes (8): contains(), listedOrganization, nameTokens(), search(), searchDoctors(), searchMedicines(), searchOrganizations(), searchSpecialties()

### Community 76 - "Organizations"
Cohesion: 0.28
Nodes (8): useEnabled(), useOrganizationDoctors(), useOrganizationSchedules(), useOrganizationServices(), useOrganizationStaff(), blank(), OrganizationSchedulesPage(), change()

### Community 77 - "Medicine Catalog"
Cohesion: 0.36
Nodes (7): getMedicineDetail(), inStockActivePharmacy, isUuidLike(), listMedicines(), MedicineRow, summaryInclude, toSummary()

### Community 78 - "API Tests"
Cohesion: 0.29
Nodes (6): assertTotals(), patients, reviews, submit(), targets, where()

### Community 79 - "Reviews"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 80 - "Provider Onboarding"
Cohesion: 0.32
Nodes (5): buildUrl(), request(), RequestOptions, onboardingApi, API_URL

### Community 81 - "Organizations"
Cohesion: 0.25
Nodes (8): CareBridge Healthcare Marketplace Demo, Doctor Portal, Healthcare Safety Boundary, Modular Monolith Architecture, Multi-Tenant Organization Model, Patient Marketplace Experience, Pharmacy Marketplace and Portal, Provider Registration and Approval

### Community 82 - "sequence ts"
Cohesion: 0.43
Nodes (6): formatSequence(), nextNumber(), nextSequenceValue(), SEQUENCE_FORMATS, sequenceKey(), SequenceName

### Community 83 - "Authentication"
Cohesion: 0.43
Nodes (5): PORTAL_HOME, portalHome(), postLoginDestination(), onSubmit(), Portal

### Community 84 - "Authentication"
Cohesion: 0.40
Nodes (5): api(), app, login(), DEMO_PASSWORD, supertest

### Community 85 - "Consultations"
Cohesion: 0.40
Nodes (4): bookAppointment(), findSlot(), Slot, startConsultation()

### Community 86 - "Orders"
Cohesion: 0.40
Nodes (5): address, base, fill(), place(), status()

### Community 87 - "personalized banner tsx"
Cohesion: 0.50
Nodes (4): greeting(), GREETINGS, PersonalizedBanner(), QUICK_ACTIONS

### Community 88 - "tsconfig build json"
Cohesion: 0.50
Nodes (3): extends, include, ./tsconfig.json

## Knowledge Gaps
- **23 isolated node(s):** `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 488 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `API Tests` to `Platform Admin`, `Labs and Records`, `Demo Seed`, `Authentication`, `API Tests`, `Cart and Checkout`, `Prescriptions`, `Doctors`, `Organizations`, `Orders`, `app ts`, `Appointments`, `Demo Seed`, `dependencies Module`, `Doctors`, `Organizations`, `Demo Seed`, `Search`, `Medicine Catalog`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication` be split into smaller, more focused modules?**
  _Cohesion score 0.11213517665130568 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Doctors` to `Authentication`, `Platform Admin`, `Doctors`, `Doctors`, `Portal Layouts`, `Doctors`, `Organizations`, `Patient Profiles`, `web package json`, `Labs and Records`, `Search`, `Authentication`, `Doctors`, `Doctors`, `Cart and Checkout`, `Prescriptions`, `Portal Layouts`, `Prescriptions`, `Orders`, `personalized banner tsx`, `Authentication`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Platform Admin` be split into smaller, more focused modules?**
  _Cohesion score 0.10523532522474881 - nodes in this community are weakly interconnected._
- **Why does `express` connect `Doctors` to `app ts`, `Demo Seed`, `Reviews`, `Cart and Checkout`, `Consultations`, `Search`, `Authentication`, `Appointments`, `Platform Admin`, `Orders`, `dependencies Module`, `Organizations`, `Prescriptions`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Doctors` be split into smaller, more focused modules?**
  _Cohesion score 0.11912568306010929 - nodes in this community are weakly interconnected._