import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, paginated, parse, uuidParam } from '../../utils/http';
import { checkoutSchema, cancelSchema, listOrdersSchema, statusSchema } from './orders.schemas';
import * as service from './orders.service';
import { assignDeliverySchema } from '../deliveries/deliveries.schemas';
import { assignDelivery } from '../deliveries/deliveries.service';
export const ordersRouter = Router();
ordersRouter.use(authenticate);
ordersRouter.get('/checkout', requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
  ok(res, await service.checkoutContext(getAuth(req))),
);
ordersRouter.post('/', requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
  created(res, await service.checkout(getAuth(req), parse(checkoutSchema, req.body))),
);
ordersRouter.get('/', async (req, res) => {
  const query = parse(listOrdersSchema, req.query);
  const result = await service.listOrders(getAuth(req), query);
  paginated(res, result.data, query.page, query.pageSize, result.total);
});
ordersRouter.get('/:id', async (req, res) => ok(res, await service.getOrder(getAuth(req), parse(uuidParam, req.params).id)));
ordersRouter.post('/:id/cancel', requirePermission(PERMISSIONS.ORDER_CREATE), async (req, res) =>
  ok(res, await service.cancelOrder(getAuth(req), parse(uuidParam, req.params).id, parse(cancelSchema, req.body).note)),
);
ordersRouter.post('/:id/status', requirePermission(PERMISSIONS.ORDER_MANAGE_PHARMACY), async (req, res) =>
  ok(res, await service.changeStatus(getAuth(req), parse(uuidParam, req.params).id, parse(statusSchema, req.body))),
);
ordersRouter.post('/:id/delivery', requirePermission(PERMISSIONS.DELIVERY_MANAGE), async (req, res) =>
  ok(res, await assignDelivery(getAuth(req), parse(uuidParam, req.params).id, parse(assignDeliverySchema, req.body).etaMinutes)),
);
