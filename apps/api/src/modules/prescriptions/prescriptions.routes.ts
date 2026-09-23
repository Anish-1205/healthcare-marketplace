import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, paginated, parse, uuidParam } from '../../utils/http';
import { createPrescriptionSchema, listPrescriptionsQuery, updatePrescriptionSchema } from './prescriptions.schemas';
import * as prescriptionsService from './prescriptions.service';

export const prescriptionsRouter = Router();
prescriptionsRouter.use(authenticate);

// Ownership (your prescription / your patient) is enforced in the service layer.
const canRead = requirePermission(
  PERMISSIONS.PRESCRIPTION_READ_OWN,
  PERMISSIONS.PRESCRIPTION_CREATE,
  PERMISSIONS.ORDER_READ_PHARMACY,
  PERMISSIONS.APPOINTMENT_READ_ORGANIZATION,
  PERMISSIONS.ADMIN_DATA_READ,
);
const canWrite = requirePermission(PERMISSIONS.PRESCRIPTION_CREATE);

prescriptionsRouter.get('/', canRead, async (req, res) => {
  const query = parse(listPrescriptionsQuery, req.query);
  const { data, total } = await prescriptionsService.listPrescriptions(getAuth(req), query);
  paginated(res, data, query.page, query.pageSize, total);
});

prescriptionsRouter.post('/', canWrite, async (req, res) => {
  const input = parse(createPrescriptionSchema, req.body);
  created(res, await prescriptionsService.createPrescription(getAuth(req), input));
});

prescriptionsRouter.get('/:id', canRead, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await prescriptionsService.getPrescription(getAuth(req), id));
});

prescriptionsRouter.patch('/:id', canWrite, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  const input = parse(updatePrescriptionSchema, req.body);
  ok(res, await prescriptionsService.updatePrescription(getAuth(req), id, input));
});

prescriptionsRouter.post('/:id/issue', canWrite, async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  ok(res, await prescriptionsService.issuePrescription(getAuth(req), id, req.ip));
});
