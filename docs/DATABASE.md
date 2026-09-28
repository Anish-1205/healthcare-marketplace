# Database

PostgreSQL 17 is provided by `docker-compose.yml` on localhost:5433. Prisma schema: `apps/api/prisma/schema.prisma`; SQL migrations: `apps/api/prisma/migrations`. Run `pnpm db:deploy` before `pnpm db:seed`. `pnpm db:seed` truncates/recreates demo records; `pnpm db:reset` drops and rebuilds the configured database. Confirm `DATABASE_URL` before either reset command.

| Area | Main models and relationships |
|---|---|
| Identity | `User` ↔ `UserRole`/`Role`/`RolePermission`/`Permission`; optional `Patient`, `Doctor`, `PlatformEmployee`; `PasswordResetToken` |
| Providers | `Organization` has `OrganizationStaff`, `OrganizationService`; `DoctorOrganization` links doctors to clinics/hospitals; `DoctorAvailability` and `DoctorBlockedDate` determine slots |
| Care | `Patient` → `Appointment` → `Consultation` → `Prescription` → `PrescriptionItem`; `AppointmentStatusHistory` records transitions |
| Pharmacy | `MedicineCategory` → `Medicine`; `PharmacyInventory` joins medicines to pharmacy organizations; `Cart`/`CartItem` → `Order`/`OrderItem` → `Delivery` |
| Money and tracking | `Payment` references an appointment, order, or lab booking; `OrderStatusHistory` and `DeliveryStatusHistory` record progression |
| Engagement/records | `Review`, `Favorite`, `Notification`, `Document`, `LabTest`/`LabPackageItem`, `LabBooking`/`LabBookingItem`, `ActivityLog`, `PlatformSetting` |

Key boundaries: a patient's addresses, appointments, prescriptions, orders, lab bookings, and documents are scoped to their identity. Organization staff access only their memberships; pharmacy inventory and orders use the pharmacy's organization ID. `Organization` also represents pharmacies (`type = PHARMACY`). Reviews and favorites point to a doctor or organization. Documents hold mock upload metadata; real file storage is not implemented.

Money fields use `Decimal(10,2)` in PostgreSQL and serialize as numbers in this demo API. Human-readable `APT`, `RX`, `ORD`, `LAB`, and `TXN` identifiers come from `SequenceCounter`; UUIDs remain the relational keys. The handwritten `20260923000000_appointment_slot_guard` migration creates a partial unique index on `(doctorId, scheduledStart)` for non-cancelled appointments. Prisma's schema cannot express that index; retain the SQL migration during schema changes. Status history, notifications, and activity logs are persistent demo records, not external audit infrastructure.
