import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, paginated, parse, uuidParam } from '../../utils/http';
import * as doctorMeService from './doctor-me.service';
import { blockedDateSchema, listMyPatientsQuery, replaceAvailabilitySchema, updateDoctorProfileSchema } from './doctor-me.schemas';

/**
 * Self-service for the signed-in doctor, mounted at `/doctors/me` (see doctors.routes.ts) ahead
 * of the public `/doctors/:id` routes, so a literal `/me` segment is never read as a doctor id.
 * The mount path matters: `authenticate` below must only ever see `/doctors/me/...` requests,
 * never the public catalogue ones.
 */
export const doctorMeRouter = Router();
doctorMeRouter.use(authenticate);

const canManageProfile = requirePermission(PERMISSIONS.DOCTOR_PROFILE_MANAGE);
const canManageAvailability = requirePermission(PERMISSIONS.DOCTOR_AVAILABILITY_MANAGE);
const canReadPatients = requirePermission(PERMISSIONS.PATIENT_READ_ASSIGNED);

doctorMeRouter.get('/', canManageProfile, async (req, res) => {
  ok(res, await doctorMeService.getMyProfile(getAuth(req)));
});

doctorMeRouter.patch('/', canManageProfile, async (req, res) => {
  const input = parse(updateDoctorProfileSchema, req.body);
  ok(res, await doctorMeService.updateMyProfile(getAuth(req), input));
});

doctorMeRouter.get('/availability', canManageAvailability, async (req, res) => {
  ok(res, await doctorMeService.getMyAvailability(getAuth(req)));
});

doctorMeRouter.put('/availability', canManageAvailability, async (req, res) => {
  const input = parse(replaceAvailabilitySchema, req.body);
  ok(res, await doctorMeService.replaceMyAvailability(getAuth(req), input));
});

doctorMeRouter.post('/blocked-dates', canManageAvailability, async (req, res) => {
  const input = parse(blockedDateSchema, req.body);
  created(res, await doctorMeService.addBlockedDate(getAuth(req), input));
});

doctorMeRouter.delete('/blocked-dates/:id', canManageAvailability, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  await doctorMeService.removeBlockedDate(getAuth(req), id);
  ok(res, { id });
});

doctorMeRouter.get('/dashboard', canManageProfile, async (req, res) => {
  ok(res, await doctorMeService.getDashboard(getAuth(req)));
});

doctorMeRouter.get('/patients', canReadPatients, async (req, res) => {
  const query = parse(listMyPatientsQuery, req.query);
  const { data, total } = await doctorMeService.listMyPatients(getAuth(req), query);
  paginated(res, data, query.page, query.pageSize, total);
});

doctorMeRouter.get('/patients/:patientId', canReadPatients, async (req, res) => {
  const { id: patientId } = parse(uuidParam, { id: req.params.patientId });
  ok(res, await doctorMeService.getMyPatient(getAuth(req), patientId));
});
