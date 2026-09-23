import { PERMISSIONS } from '@carebridge/shared';
import { Router } from 'express';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, parse, uuidParam } from '../../utils/http';
import * as service from './organization-me.service';
import {
  associateDoctorSchema, createStaffSchema, organizationQuery, replaceDoctorScheduleSchema,
  reportQuerySchema, saveServiceSchema, updateDoctorLinkSchema, updateOrganizationProfileSchema, updateStaffSchema,
} from './organization-me.schemas';

export const organizationMeRouter = Router();
organizationMeRouter.use(authenticate);

const canRead = requirePermission(PERMISSIONS.APPOINTMENT_READ_ORGANIZATION);
const canManageProfile = requirePermission(PERMISSIONS.ORGANIZATION_PROFILE_MANAGE);
const canManageDoctors = requirePermission(PERMISSIONS.ORGANIZATION_DOCTOR_MANAGE);
const canManageStaff = requirePermission(PERMISSIONS.ORGANIZATION_STAFF_MANAGE);
const canManageServices = requirePermission(PERMISSIONS.ORGANIZATION_SERVICE_MANAGE);
const canReadReports = requirePermission(PERMISSIONS.ORGANIZATION_REPORT_READ);

const selectedOrganization = (req: { query: unknown }) => parse(organizationQuery, req.query).organizationId;

organizationMeRouter.get('/', canRead, async (req, res) => ok(res, await service.getProfile(getAuth(req), selectedOrganization(req))));
organizationMeRouter.patch('/', canManageProfile, async (req, res) => ok(res, await service.updateProfile(getAuth(req), parse(updateOrganizationProfileSchema, req.body), selectedOrganization(req))));
organizationMeRouter.get('/dashboard', canRead, async (req, res) => ok(res, await service.getDashboard(getAuth(req), selectedOrganization(req))));

organizationMeRouter.get('/doctors', canRead, async (req, res) => ok(res, await service.listDoctors(getAuth(req), selectedOrganization(req))));
organizationMeRouter.post('/doctors', canManageDoctors, async (req, res) => created(res, await service.associateDoctor(getAuth(req), parse(associateDoctorSchema, req.body), selectedOrganization(req))));
organizationMeRouter.patch('/doctors/:id', canManageDoctors, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await service.updateDoctor(getAuth(req), id, parse(updateDoctorLinkSchema, req.body), selectedOrganization(req)));
});

organizationMeRouter.get('/staff', canRead, async (req, res) => ok(res, await service.listStaff(getAuth(req), selectedOrganization(req))));
organizationMeRouter.post('/staff', canManageStaff, async (req, res) => created(res, await service.createStaff(getAuth(req), parse(createStaffSchema, req.body), selectedOrganization(req))));
organizationMeRouter.patch('/staff/:id', canManageStaff, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await service.updateStaff(getAuth(req), id, parse(updateStaffSchema, req.body), selectedOrganization(req)));
});

organizationMeRouter.get('/services', canRead, async (req, res) => ok(res, await service.listServices(getAuth(req), selectedOrganization(req))));
organizationMeRouter.post('/services', canManageServices, async (req, res) => created(res, await service.createService(getAuth(req), parse(saveServiceSchema, req.body), selectedOrganization(req))));
organizationMeRouter.patch('/services/:id', canManageServices, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await service.updateService(getAuth(req), id, parse(saveServiceSchema, req.body), selectedOrganization(req)));
});

organizationMeRouter.get('/patients', requirePermission(PERMISSIONS.PATIENT_READ_ORGANIZATION), async (req, res) => ok(res, await service.listPatients(getAuth(req), selectedOrganization(req))));
organizationMeRouter.get('/schedules', canRead, async (req, res) => ok(res, await service.listSchedules(getAuth(req), selectedOrganization(req))));
organizationMeRouter.put('/doctors/:id/schedule', canManageDoctors, async (req, res) => {
  const { id } = parse(uuidParam, req.params); const input = parse(replaceDoctorScheduleSchema, req.body);
  ok(res, await service.replaceDoctorSchedule(getAuth(req), id, input.windows, selectedOrganization(req)));
});
organizationMeRouter.get('/reports', canReadReports, async (req, res) => ok(res, await service.getReport(getAuth(req), parse(reportQuerySchema, req.query))));
