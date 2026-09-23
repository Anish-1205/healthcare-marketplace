import { Router } from 'express';
import { authenticate, getAuth } from '../../middleware/auth';
import { ok, paginated, paginationQuery, parse } from '../../utils/http';
import { simulatePaymentSchema } from './payments.schemas';
import { listPayments, simulatePayment } from './payments.service';
export const paymentsRouter = Router();
paymentsRouter.use(authenticate);
paymentsRouter.post('/simulate', async (req, res) =>
  ok(res, await simulatePayment(getAuth(req), parse(simulatePaymentSchema, req.body).orderId)),
);
paymentsRouter.get('/', async (req, res) => {
  const query = parse(paginationQuery, req.query);
  const result = await listPayments(getAuth(req), query.page, query.pageSize);
  paginated(res, result.data, query.page, query.pageSize, result.total);
});
