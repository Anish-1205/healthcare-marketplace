import { APPROVAL_STATUSES, APPOINTMENT_STATUSES, CONSULTATION_TYPES, ORDER_STATUSES, ORGANIZATION_TYPES } from '@carebridge/shared';
import { z } from 'zod';
import { paginationQuery } from '../../utils/http';

const bool = z.preprocess((value) => value === 'true' ? true : value === 'false' ? false : value, z.boolean());
export const adminListQuery = paginationQuery.extend({ q: z.string().trim().max(120).optional() });
export const organizationListQuery = adminListQuery.extend({ type: z.enum(ORGANIZATION_TYPES).optional(), approvalStatus: z.enum(APPROVAL_STATUSES).optional(), isActive: bool.optional() });
export const doctorListQuery = adminListQuery.extend({ approvalStatus: z.enum(APPROVAL_STATUSES).optional(), isActive: bool.optional() });
export const patientListQuery = adminListQuery.extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL']).optional() });
export const appointmentListQuery = adminListQuery.extend({ status: z.enum(APPOINTMENT_STATUSES).optional(), consultationType: z.enum(CONSULTATION_TYPES).optional(), from: z.iso.date().optional(), to: z.iso.date().optional() });
export const orderListQuery = adminListQuery.extend({ status: z.enum(ORDER_STATUSES).optional(), pharmacyId: z.uuid().optional(), from: z.iso.date().optional(), to: z.iso.date().optional() });
export const activityListQuery = adminListQuery.extend({ action: z.string().trim().max(100).optional(), entityType: z.string().trim().max(100).optional(), from: z.iso.date().optional(), to: z.iso.date().optional() });
export const reportQuery = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() });

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(150), type: z.enum(ORGANIZATION_TYPES), category: nullableText(100), description: nullableText(2000),
  contactPerson: nullableText(120), phone: nullableText(30), email: z.email().nullable().optional(), registrationNumber: nullableText(100), licenseNumber: nullableText(100),
  addressLine1: nullableText(200), addressLine2: nullableText(200), locality: nullableText(100), city: nullableText(100), state: nullableText(100), postalCode: nullableText(20),
});
export const entityStatusSchema = z.object({ isActive: z.boolean() });
export const userStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });
export const approvalSchema = z.object({ reason: z.string().trim().min(3).max(1000).optional() });
export const rejectionSchema = z.object({ reason: z.string().trim().min(3).max(1000) });

export const createEmployeeSchema = z.object({
  email: z.email(), password: z.string().min(8).max(100).optional(), firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), phone: nullableText(30),
  employeeCode: z.string().trim().min(2).max(30), department: z.string().trim().min(2).max(100), jobTitle: z.string().trim().min(2).max(120), role: z.enum(['PLATFORM_EMPLOYEE', 'PLATFORM_ADMIN']),
});
export const updateEmployeeSchema = z.object({ department: z.string().trim().min(2).max(100).optional(), jobTitle: z.string().trim().min(2).max(120).optional(), role: z.enum(['PLATFORM_EMPLOYEE', 'PLATFORM_ADMIN']).optional(), isActive: z.boolean().optional() });
export const updateSettingsSchema = z.object({ settings: z.array(z.object({ key: z.string().trim().min(1).max(120), value: z.string().max(5000) })).min(1).max(100) });

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
