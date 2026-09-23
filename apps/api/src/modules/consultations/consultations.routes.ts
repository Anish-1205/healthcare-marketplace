import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { ok, paginated, parse, uuidParam } from '../../utils/http';
import { listConsultationsQuery, updateConsultationSchema } from './consultations.schemas';
import * as consultationsService from './consultations.service';

export const consultationsRouter = Router();
consultationsRouter.use(authenticate);

// Ownership (your consultation / your record) is enforced in the service layer.
const canRead = requirePermission(
  PERMISSIONS.CONSULTATION_MANAGE,
  PERMISSIONS.PRESCRIPTION_READ_OWN,
  PERMISSIONS.APPOINTMENT_READ_ORGANIZATION,
  PERMISSIONS.ADMIN_DATA_READ,
);
const canWrite = requirePermission(PERMISSIONS.CONSULTATION_MANAGE);

consultationsRouter.get('/', canRead, async (req, res) => {
  const query = parse(listConsultationsQuery, req.query);
  const { data, total } = await consultationsService.listConsultations(getAuth(req), query);
  paginated(res, data, query.page, query.pageSize, total);
});

consultationsRouter.get('/:id', canRead, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await consultationsService.getConsultation(getAuth(req), id));
});

consultationsRouter.patch('/:id', canWrite, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  const input = parse(updateConsultationSchema, req.body);
  ok(res, await consultationsService.updateConsultation(getAuth(req), id, input));
});

consultationsRouter.post('/:id/complete', canWrite, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await consultationsService.completeConsultation(getAuth(req), id, req.ip));
});
