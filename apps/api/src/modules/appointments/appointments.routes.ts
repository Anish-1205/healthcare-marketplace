import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, paginated, parse, uuidParam } from '../../utils/http';
import * as consultationsService from '../consultations/consultations.service';
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsQuery,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from './appointments.schemas';
import * as appointmentsService from './appointments.service';

export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate);

// Ownership (is this *your* appointment) is enforced in the service layer.
const canRead = requirePermission(
  PERMISSIONS.APPOINTMENT_READ_OWN,
  PERMISSIONS.APPOINTMENT_READ_DOCTOR,
  PERMISSIONS.APPOINTMENT_READ_ORGANIZATION,
);
const canManage = requirePermission(
  PERMISSIONS.APPOINTMENT_BOOK,
  PERMISSIONS.APPOINTMENT_MANAGE_DOCTOR,
  PERMISSIONS.APPOINTMENT_MANAGE_ORGANIZATION,
);
// Confirm / check-in / no-show are provider-side moves only — patients never call this one.
const canUpdateStatus = requirePermission(PERMISSIONS.APPOINTMENT_MANAGE_DOCTOR, PERMISSIONS.APPOINTMENT_MANAGE_ORGANIZATION);

appointmentsRouter.get('/', canRead, async (req, res) => {
  const query = parse(listAppointmentsQuery, req.query);
  const { data, total } = await appointmentsService.listAppointments(getAuth(req), query);
  paginated(res, data, query.page, query.pageSize, total);
});

appointmentsRouter.post('/', requirePermission(PERMISSIONS.APPOINTMENT_BOOK), async (req, res) => {
  const input = parse(bookAppointmentSchema, req.body);
  created(res, await appointmentsService.bookAppointment(getAuth(req), input, req.ip));
});

appointmentsRouter.get('/:id', canRead, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await appointmentsService.getAppointment(getAuth(req), id));
});

appointmentsRouter.post('/:id/cancel', canManage, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  const input = parse(cancelAppointmentSchema, req.body ?? {});
  ok(res, await appointmentsService.cancelAppointment(getAuth(req), id, input, req.ip));
});

appointmentsRouter.post('/:id/reschedule', canManage, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  const input = parse(rescheduleAppointmentSchema, req.body);
  ok(res, await appointmentsService.rescheduleAppointment(getAuth(req), id, input, req.ip));
});

appointmentsRouter.post('/:id/status', canUpdateStatus, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  const input = parse(updateAppointmentStatusSchema, req.body);
  ok(res, await appointmentsService.updateAppointmentStatus(getAuth(req), id, input, req.ip));
});

/** Opens the consultation workspace for this appointment (creating it on first entry). */
appointmentsRouter.post('/:id/consultation', requirePermission(PERMISSIONS.CONSULTATION_MANAGE), async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  created(res, await consultationsService.startConsultation(getAuth(req), id, req.ip));
});
