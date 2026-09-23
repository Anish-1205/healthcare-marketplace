import { PERMISSIONS } from '@carebridge/shared';
import { Router } from 'express';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, paginated, parse, uuidParam } from '../../utils/http';
import * as service from './admin.service';
import {
  activityListQuery, adminListQuery, appointmentListQuery, approvalSchema, createEmployeeSchema,
  createOrganizationSchema, doctorListQuery, entityStatusSchema, orderListQuery, organizationListQuery,
  patientListQuery, rejectionSchema, reportQuery, updateEmployeeSchema, updateSettingsSchema, userStatusSchema,
} from './admin.schemas';

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.get('/reviews', requirePermission(PERMISSIONS.REVIEW_MODERATE), async (_req, res) => ok(res, await service.listReviews()));
adminRouter.post('/reviews/:id/approve', requirePermission(PERMISSIONS.REVIEW_MODERATE), async (req, res) => ok(res, await service.moderateReview(getAuth(req), parse(uuidParam, req.params).id, 'APPROVED')));
adminRouter.post('/reviews/:id/reject', requirePermission(PERMISSIONS.REVIEW_MODERATE), async (req, res) => ok(res, await service.moderateReview(getAuth(req), parse(uuidParam, req.params).id, 'REJECTED')));

const readDashboard = requirePermission(PERMISSIONS.ADMIN_DASHBOARD_READ);
const readData = requirePermission(PERMISSIONS.ADMIN_DATA_READ);
const manageApprovals = requirePermission(PERMISSIONS.APPROVAL_MANAGE);
const manageUsers = requirePermission(PERMISSIONS.USER_MANAGE);
const manageOrganizations = requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
const manageEmployees = requirePermission(PERMISSIONS.EMPLOYEE_MANAGE);
const readActivity = requirePermission(PERMISSIONS.ACTIVITY_LOG_READ);
const manageSettings = requirePermission(PERMISSIONS.SETTINGS_MANAGE);

adminRouter.get('/overview', readDashboard, async (_req, res) => ok(res, await service.getOverview()));

adminRouter.get('/organizations', readData, async (req, res) => { const query = parse(organizationListQuery, req.query); const result = await service.listOrganizations(query); paginated(res, result.data, query.page, query.pageSize, result.total); });
adminRouter.post('/organizations', manageOrganizations, async (req, res) => created(res, await service.createOrganization(getAuth(req), parse(createOrganizationSchema, req.body), req.ip)));
adminRouter.get('/organizations/:id', readData, async (req, res) => ok(res, await service.getOrganization(parse(uuidParam, req.params).id)));
adminRouter.patch('/organizations/:id/status', manageOrganizations, async (req, res) => ok(res, await service.updateOrganizationStatus(getAuth(req), parse(uuidParam, req.params).id, parse(entityStatusSchema, req.body).isActive, req.ip)));

adminRouter.get('/doctors', readData, async (req, res) => { const query = parse(doctorListQuery, req.query); const result = await service.listDoctors(query); paginated(res, result.data, query.page, query.pageSize, result.total); });
adminRouter.get('/doctors/:id', readData, async (req, res) => ok(res, await service.getDoctor(parse(uuidParam, req.params).id)));
adminRouter.patch('/doctors/:id/status', manageUsers, async (req, res) => ok(res, await service.updateDoctorStatus(getAuth(req), parse(uuidParam, req.params).id, parse(entityStatusSchema, req.body).isActive, req.ip)));

adminRouter.get('/patients', readData, async (req, res) => { const query = parse(patientListQuery, req.query); const result = await service.listPatients(query); paginated(res, result.data, query.page, query.pageSize, result.total); });
adminRouter.get('/patients/:id', readData, async (req, res) => ok(res, await service.getPatient(parse(uuidParam, req.params).id)));
adminRouter.patch('/users/:id/status', manageUsers, async (req, res) => ok(res, await service.updateUserStatus(getAuth(req), parse(uuidParam, req.params).id, parse(userStatusSchema, req.body).status, req.ip)));

adminRouter.get('/appointments', readData, async (req, res) => { const query = parse(appointmentListQuery, req.query); const result = await service.listAppointments(query); paginated(res, result.data, query.page, query.pageSize, result.total); });
adminRouter.get('/orders', readData, async (req, res) => { const query = parse(orderListQuery, req.query); const result = await service.listOrders(query); paginated(res, result.data, query.page, query.pageSize, result.total); });

adminRouter.get('/approvals', manageApprovals, async (_req, res) => ok(res, await service.listApprovals()));
adminRouter.post('/approvals/:type/:id/approve', manageApprovals, async (req, res) => { const type = req.params.type === 'doctor' ? 'doctor' : req.params.type === 'organization' ? 'organization' : null; if (!type) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Approval type was not found.' } }); return ok(res, await service.decideApproval(getAuth(req), type, parse(uuidParam, { id: req.params.id }).id, 'approve', parse(approvalSchema, req.body ?? {}).reason, req.ip)); });
adminRouter.post('/approvals/:type/:id/reject', manageApprovals, async (req, res) => { const type = req.params.type === 'doctor' ? 'doctor' : req.params.type === 'organization' ? 'organization' : null; if (!type) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Approval type was not found.' } }); return ok(res, await service.decideApproval(getAuth(req), type, parse(uuidParam, { id: req.params.id }).id, 'reject', parse(rejectionSchema, req.body).reason, req.ip)); });

adminRouter.get('/employees', readData, async (req, res) => { const query = parse(adminListQuery, req.query); const result = await service.listEmployees(query); paginated(res, result.data, query.page, query.pageSize, result.total); });
adminRouter.post('/employees', manageEmployees, async (req, res) => created(res, await service.createEmployee(getAuth(req), parse(createEmployeeSchema, req.body), req.ip)));
adminRouter.patch('/employees/:id', manageEmployees, async (req, res) => ok(res, await service.updateEmployee(getAuth(req), parse(uuidParam, req.params).id, parse(updateEmployeeSchema, req.body), req.ip)));

adminRouter.get('/reports', readDashboard, async (req, res) => { const query = parse(reportQuery, req.query); ok(res, await service.getReport(query.from, query.to)); });
adminRouter.get('/activity', readActivity, async (req, res) => { const query = parse(activityListQuery, req.query); const result = await service.listActivity(query); paginated(res, result.data, query.page, query.pageSize, result.total); });
adminRouter.get('/settings', readData, async (_req, res) => ok(res, await service.listSettings()));
adminRouter.patch('/settings', manageSettings, async (req, res) => ok(res, await service.updateSettings(getAuth(req), parse(updateSettingsSchema, req.body).settings, req.ip)));
