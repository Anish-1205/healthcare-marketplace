# Roles and access

`packages/shared/src/permissions.ts` is the permission matrix used by the API. API middleware verifies a bearer token and checks a role permission; service methods then check ownership or organization membership. UI route guards improve navigation but are not the access boundary. `UserRole` records roles; organization membership is stored in `OrganizationStaff`.

| Role | Main allowed work |
|---|---|
| Patient | Own profile, booking, prescriptions, cart/orders, labs, health records, reviews, favorites |
| Doctor | Own profile/availability, assigned appointments and patients, consultations, prescriptions |
| Clinic/Hospital staff | Organization appointments and patients; appointment actions |
| Clinic/Hospital admin | Staff access plus organization profile, doctors, services, schedules, reports |
| Pharmacy staff | Inventory permission, own pharmacy orders and simulated delivery actions |
| Pharmacy admin | Staff access plus pharmacy profile, staff and report permissions |
| Platform employee | Overview/data, approvals, review moderation, activity log |
| Platform admin | Employee access plus user/organization/employee management, settings and demo reset |
| Super admin | All declared permissions |

Permission grants do not imply access to every record. For example, a doctor can issue a prescription only for their own consultation; a pharmacy can progress only its own order; a clinic admin cannot select another organization with `organizationId`. Patient records are scoped to the signed-in patient. Super-admin actions still follow explicit service rules such as protected super-admin account status changes. See `apps/api/src/middleware/auth.ts` and `apps/api/src/services/tenant.service.ts` for enforcement.
