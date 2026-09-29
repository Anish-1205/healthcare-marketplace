# Database schema

Reviewed: 2026-09-29. Source: [schema.prisma](../apps/api/prisma/schema.prisma) and migrations [20260922000000_init](../apps/api/prisma/migrations/20260922000000_init/migration.sql), [20260923000000_appointment_slot_guard](../apps/api/prisma/migrations/20260923000000_appointment_slot_guard/migration.sql). All primary keys are UUID; money columns are `Decimal(10,2)` in INR unless noted. Table names are snake_case plurals (`@@map`); this document uses Prisma model names.

## Auth / users / RBAC

- **User** — email (unique), password hash, name, phone, `status` (`ACTIVE`/`INACTIVE`/`PENDING_APPROVAL`), `lastLoginAt`. Indexes on `status` and `createdAt`. One-to-one with `Patient`, `Doctor`, `PlatformEmployee`; one-to-many with `UserRole`, `OrganizationStaff`, `Address`, `Notification`, `Document`, `ActivityLog`, `PasswordResetToken`.
- **Role** — `name` (`RoleName` enum, unique), `scope` (`RoleScope`: `PATIENT`/`PROVIDER`/`ORGANIZATION`/`PLATFORM`).
- **Permission** — `key` (unique string), `module`.
- **RolePermission** — join table, composite PK `(roleId, permissionId)`. Populated by seed from the shared TypeScript permission matrix, not the authorization source of truth at runtime — see [ARCHITECTURE](ARCHITECTURE.md) and [DECISIONS_LOG](DECISIONS_LOG.md).
- **UserRole** — join table, composite PK `(userId, roleId)`, indexed on `roleId`. A user can hold multiple roles.
- **PasswordResetToken** — hashed token (unique), `expiresAt`, `usedAt` (nullable — claimed once). Indexed on `userId`.
- **PlatformEmployee** — one-to-one with `User`; `employeeCode` (unique), `department`, `jobTitle`, `isActive`.

`RoleName` enum: `PATIENT`, `DOCTOR`, `CLINIC_ADMIN`, `CLINIC_STAFF`, `HOSPITAL_ADMIN`, `HOSPITAL_STAFF`, `PHARMACY_ADMIN`, `PHARMACY_STAFF`, `PLATFORM_EMPLOYEE`, `PLATFORM_ADMIN`, `SUPER_ADMIN`. `UserStatus`: `ACTIVE`, `INACTIVE`, `PENDING_APPROVAL`. `ApprovalStatus` (shared by Doctor/Organization): `PENDING_APPROVAL`, `APPROVED`, `REJECTED`.

## Patients

- **Patient** — one-to-one with `User`; `patientCode` (unique), DOB, gender, blood group, emergency contact fields, `preferredPharmacyId` (nullable FK to `Organization`, `SetNull` on delete). Owns `appointments`, `consultations`, `prescriptions`, `cart` (0/1), `orders`, `payments`, `reviews`, `favorites`, `documents`, `labBookings`.
- **Address** — belongs to `User` (not `Patient`) so any account can hold delivery/lab addresses; `isDefault` flag; used by `Order.address` (snapshotted at checkout) and `LabBooking.address` (not snapshotted — see [FEATURES](FEATURES.md)). Indexed on `userId`.

## Doctors

- **Specialty** — name/slug unique, `sortOrder`; linked to doctors (`DoctorSpecialty`) and `OrganizationService`.
- **Doctor** — one-to-one with `User`; `slug` and `registrationNumber` unique; `consultationFee` (Decimal 10,2); `consultationTypes` (`ConsultationType[]`: `IN_PERSON`/`VIDEO`/`PHONE`); `avgRating` (Decimal 2,1), `reviewCount`; `approvalStatus`; `isActive`. Index on `(approvalStatus, isActive)` supports directory filtering.
- **DoctorSpecialty** — composite PK `(doctorId, specialtyId)`, `isPrimary` flag, indexed on `specialtyId`.
- **DoctorOrganization** — doctor-to-organization affiliation; unique on `(doctorId, organizationId)`; optional per-organization `consultationFee` override; `isPrimary`, `isActive`.
- **DoctorAvailability** — recurring weekly window; `organizationId` nullable (independent/online schedule); `dayOfWeek` 0–6 (CHECK `doctor_availability_day_chk` enforces range; CHECK `doctor_availability_time_chk` enforces `startTime < endTime`); `consultationTypes[]`. Indexed on `(doctorId, dayOfWeek)`.
- **DoctorBlockedDate** — unique `(doctorId, date)`.

## Organizations (clinics, hospitals, pharmacies)

- **Organization** — single table for all three `OrganizationType` values (`CLINIC`, `HOSPITAL`, `PHARMACY`); type-specific optional columns coexist (hospital: `bedCount`, `emergencyAvailable`; pharmacy: `deliveryAvailable`, `pickupAvailable`, `acceptsPrescriptions`, `deliveryEtaMin/MaxMinutes`, `deliveryFee`, `freeDeliveryAbove`, `serviceRadiusKm`). `distanceKm` is a stored mock value, not computed geolocation (see [FEATURES](FEATURES.md)). `approvalStatus`, `isActive`. Indexes: `(type, approvalStatus, isActive)` and `locality`.
- **OrganizationStaff** — membership join; `staffRole` (`ADMIN`/`STAFF`); unique `(organizationId, userId)`, indexed on `userId`. This is the tenant-membership record scrutinized in [SECURITY_AUDIT](SECURITY_AUDIT.md) finding S03.
- **OrganizationService** — services/procedures an org offers; optional `specialtyId`, `price`, `durationMinutes`. Indexed on `organizationId`.

## Appointments, consultations, prescriptions

- **Appointment** — `appointmentNumber` (unique, human-readable), `patientId`/`doctorId` (`onDelete: Restrict` — cannot delete a patient/doctor with appointment history), optional `organizationId` (`SetNull`). `status` (`AppointmentStatus`: `PENDING`→`CONFIRMED`→`CHECKED_IN`→`IN_CONSULTATION`→`COMPLETED`, or `CANCELLED`/`NO_SHOW`). CHECK `appointments_time_chk`: `scheduledStart < scheduledEnd`. Indexes: `(doctorId, scheduledStart)`, `(patientId, scheduledStart)`, `(organizationId, scheduledStart)`, `status`.
  - **Concurrency guard**: migration [20260923000000_appointment_slot_guard](../apps/api/prisma/migrations/20260923000000_appointment_slot_guard/migration.sql) adds a **partial unique index** `appointments_doctor_slot_active_key` on `(doctorId, scheduledStart) WHERE status <> 'CANCELLED'`. This is hand-written SQL (not expressible in `schema.prisma`) and is the database-level backstop against double-booking a doctor's slot; cancelled appointments are excluded so a freed slot can be rebooked. It is a point-equality constraint, not a general interval-overlap exclusion (no `EXCLUDE USING gist` range constraint exists) — see [ARCHITECTURE](ARCHITECTURE.md) and [PERFORMANCE_AUDIT](PERFORMANCE_AUDIT.md).
- **AppointmentStatusHistory** — append-only log; `fromStatus`/`toStatus`, optional `changedById` (`SetNull`). Indexed on `(appointmentId, createdAt)`.
- **Consultation** — one-to-one with `Appointment` (unique `appointmentId`); `status` (`IN_PROGRESS`/`COMPLETED`); free-text `chiefComplaint`/`notes`/`diagnosis`/`observations` (manually entered, no generation). Indexes on `(doctorId, startedAt)`, `(patientId, startedAt)`.
- **Prescription** — `prescriptionNumber` unique; optional `consultationId` (`SetNull`), `organizationId` (`SetNull`); `status` (`DRAFT`/`ISSUED`/`CANCELLED`); `validUntil` (date-only, not enforced at fulfillment per [SECURITY_AUDIT](SECURITY_AUDIT.md) S06). Indexes: `(patientId, status)`, `(doctorId, createdAt)`.
- **PrescriptionItem** — free-text `dosage`/`frequency`/`duration`/`timing` typed by the doctor; optional `medicineId` (`SetNull`) linking to the catalogue; CHECK `prescription_items_quantity_chk`: `quantity > 0`. Indexed on `prescriptionId`.

## Medicines & pharmacy inventory

- **MedicineCategory** — name/slug unique, display metadata.
- **Medicine** — platform-wide catalogue entry; `slug` unique; `mrp`; `requiresPrescription`; `dosageForm` (`DosageForm` enum, 15 values); optional `createdByOrganizationId` (`SetNull`). Indexes on `categoryId`, `name`.
- **PharmacyInventory** — per-pharmacy price/stock for a medicine; unique `(pharmacyId, medicineId)`; `mrp`, `sellingPrice`, `stockQuantity`, `lowStockThreshold`, optional `batchNumber`/`expiryDate`. CHECK `pharmacy_inventory_stock_chk`: `stockQuantity >= 0`; a second CHECK constrains `sellingPrice >= 0 AND sellingPrice <= mrp`. Indexed on `medicineId`.

## Cart, orders, payments, delivery

- **Cart** — one active cart per patient (unique `patientId`); optional `pharmacyId` and `prescriptionId` (both `SetNull`). A cart is bound to a single pharmacy — prices are pharmacy-specific (see [DECISIONS_LOG](DECISIONS_LOG.md)).
- **CartItem** — unique `(cartId, medicineId)`; CHECK `cart_items_quantity_chk`: `quantity > 0`.
- **Order** — `orderNumber` unique; `patientId`/`pharmacyId` (`Restrict`); optional `prescriptionId`, `uploadedDocumentId`, `addressId` (all `SetNull`); **delivery address is snapshotted onto the order row** (`deliveryRecipient`/`deliveryLine1`/etc.) so later address edits don't change history; money columns `subtotalMrp`, `discountTotal`, `deliveryFee`, `platformFee`, `totalAmount` (all Decimal 10,2); `status` (`OrderStatus`: `PENDING`→`PRESCRIPTION_REVIEW`→`CONFIRMED`→`PREPARING`→`READY_FOR_PICKUP`/`OUT_FOR_DELIVERY`→`DELIVERED`, or `CANCELLED`/`REJECTED`); `fulfillmentType` (`DELIVERY`/`PICKUP`). Indexes: `(pharmacyId, status, placedAt)`, `(patientId, placedAt)`, `status`.
- **OrderItem** — snapshotted `medicineName`/`packSize`/`unitMrp`/`unitPrice`/`lineTotal` at checkout time; `approvedQuantity` nullable (pharmacy may only reduce it, per service-layer rule in [FEATURES](FEATURES.md)); optional `medicineId` (`SetNull`). Indexed on `orderId`, `medicineId`.
- **OrderStatusHistory** — append-only, mirrors `AppointmentStatusHistory` shape. Indexed on `(orderId, createdAt)`.
- **Payment** — simulated payment/refund record (comment in schema: "No real gateway is involved"); `transactionRef` unique; `purpose` (`PaymentPurpose`: `APPOINTMENT`/`ORDER`/`LAB_BOOKING`) with optional FKs to each (`SetNull`); CHECK `payments_target_chk` enforces exactly the FK matching `purpose` is non-null; CHECK `payments_amount_chk`: `amount >= 0`; `status` (`PENDING`/`PAID`/`FAILED`/`REFUNDED`). Indexes: `(patientId, createdAt)`, `status`.
- **Delivery** — one-to-one with `Order` (unique `orderId`); simulated `agentName`/`agentPhone`/`vehicleType`/`vehicleNumber`; `status` (`ASSIGNED`→`PICKED_UP`→`ON_THE_WAY`→`DELIVERED`). Indexed on `status`.
- **DeliveryStatusHistory** — append-only. Indexed on `(deliveryId, createdAt)`.

## Engagement: reviews, favorites, notifications

- **Review** — polymorphic target: exactly one of `doctorId`/`organizationId` is set, enforced by migration CHECK `num_nonnulls("doctorId","organizationId") = 1`; a second CHECK enforces `rating BETWEEN 1 AND 5`; optional links to the originating `appointmentId`/`orderId` (`SetNull`); `status` (`ModerationStatus`: `PENDING`/`APPROVED`/`REJECTED`). Indexes: `(doctorId, status)`, `(organizationId, status)`, `patientId`.
- **Favorite** — same one-of-two-targets CHECK pattern as `Review`; two separate unique constraints, `(patientId, doctorId)` and `(patientId, organizationId)`, provide idempotent add-favorite semantics per target type.
- **Notification** — user-scoped (`userId`); `type` (`NotificationType`, 17 values covering appointment/prescription/order/registration/lab lifecycle events, plus `SYSTEM`); `link` (frontend route string); `isRead`/`readAt`. Indexed on `(userId, isRead, createdAt)` — supports the unread-count and list queries in [notifications.routes.ts](../apps/api/src/modules/notifications/notifications.routes.ts).

## Documents & health records

- **Document** — mock file storage: stores `storageUrl`/`mimeType`/`sizeBytes`/`fileName` metadata only, not file bytes (per schema section comment and [FEATURES](FEATURES.md)); `type` (`DocumentType`, 9 values); optional `patientId`/`organizationId` (`Cascade`). Used by `Order.uploadedDocument` and `LabBooking.reportDocument`. Indexes: `(patientId, type)`, `organizationId`.

## Labs

- **LabTest** — `code`/`slug` unique; `isPackage` flag; self-referential package composition via `LabPackageItem` (composite PK `(packageId, testId)`, two relations `PackageTests`/`IncludedTest`).
- **LabBooking** — `bookingNumber` unique; optional `addressId` (`SetNull`, **not snapshotted** — a later address edit changes booking display, unlike `Order`); `collectionType` (`HOME_COLLECTION`/`LAB_VISIT`); `status` (`BOOKED`→`SAMPLE_COLLECTED`→`PROCESSING`→`REPORT_READY`, or `CANCELLED`); optional `reportDocumentId`. Indexed on `(patientId, scheduledDate)`.
- **LabBookingItem** — unique `(labBookingId, labTestId)`; `labTest` relation is `onDelete: Restrict`.

## Platform: activity log, settings, sequences

- **ActivityLog** — `action` (free string, e.g. `"appointment.booked"`), `entityType`/`entityId`, `metadata` (Json), `ipAddress`; optional `actorUserId`/`organizationId` (`SetNull`). Indexes: `createdAt`, `(organizationId, createdAt)`, `(entityType, entityId)`. Coverage gaps noted in [SECURITY_AUDIT](SECURITY_AUDIT.md) S09.
- **PlatformSetting** — simple key/value store (`key` is the PK, a string, not UUID); backs `/config` reference endpoint (marketplace name, platform fee, disclaimer, etc.) — see [API_REFERENCE](API_REFERENCE.md).
- **SequenceCounter** — atomic counters for human-readable numbers (e.g. `RX-2026`, `ORD-2026`), `key` is the PK.

## Cross-cutting notes

- No row-level security policies were found in the migrations; tenant isolation for organizations is enforced entirely in application/service code (see [ARCHITECTURE](ARCHITECTURE.md)).
- Every append-only history table (`AppointmentStatusHistory`, `OrderStatusHistory`, `DeliveryStatusHistory`) follows the same `fromStatus`/`toStatus`/`note`/`changedBy`/`createdAt` shape — see [CONVENTIONS](CONVENTIONS.md).
- Money is `Decimal(10,2)` at rest throughout; API DTOs commonly convert to JS `number` (see [ARCHITECTURE](ARCHITECTURE.md), [CODE_QUALITY_AUDIT](CODE_QUALITY_AUDIT.md)).
