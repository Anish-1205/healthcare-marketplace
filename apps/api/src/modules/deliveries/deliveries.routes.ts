import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { ok, parse, uuidParam } from '../../utils/http';
import { deliveryStatusSchema } from './deliveries.schemas';
import { updateDelivery } from './deliveries.service';
export const deliveriesRouter = Router();
deliveriesRouter.use(authenticate, requirePermission(PERMISSIONS.DELIVERY_MANAGE));
deliveriesRouter.post('/:id/status', async (req, res) => {
  ok(res, await updateDelivery(getAuth(req), parse(uuidParam, req.params).id, parse(deliveryStatusSchema, req.body).status));
});
