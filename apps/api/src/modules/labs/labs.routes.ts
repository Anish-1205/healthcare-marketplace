import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, paginated, parse, uuidParam } from '../../utils/http';
import { createLabBookingSchema, labTestParamSchema, listHealthDocumentsSchema, listLabBookingsSchema, listLabTestsSchema, uploadHealthDocumentSchema } from './labs.schemas';
import * as service from './labs.service';

export const labTestsRouter = Router();
labTestsRouter.get('/', async (req, res) => {
  const query = parse(listLabTestsSchema, req.query);
  const result = await service.listLabTests(query);
  paginated(res, result.data, query.page, query.pageSize, result.total);
});
labTestsRouter.get('/categories', async (_req, res) => ok(res, await service.labCategories()));
labTestsRouter.get('/:id', async (req, res) => ok(res, await service.getLabTest(parse(labTestParamSchema, req.params).id)));

export const labBookingsRouter = Router();
labBookingsRouter.use(authenticate, requirePermission(PERMISSIONS.LAB_BOOKING_CREATE));
labBookingsRouter.get('/context', async (req, res) => ok(res, await service.bookingContext(getAuth(req))));
labBookingsRouter.get('/', async (req, res) => {
  const query = parse(listLabBookingsSchema, req.query);
  const result = await service.listLabBookings(getAuth(req), query);
  paginated(res, result.data, query.page, query.pageSize, result.total);
});
labBookingsRouter.post('/', async (req, res) => created(res, await service.createLabBooking(getAuth(req), parse(createLabBookingSchema, req.body))));
labBookingsRouter.get('/:id', async (req, res) => ok(res, await service.getLabBooking(getAuth(req), parse(uuidParam, req.params).id)));
labBookingsRouter.post('/:id/cancel', async (req, res) => ok(res, await service.cancelLabBooking(getAuth(req), parse(uuidParam, req.params).id)));

export const healthRecordsRouter = Router();
healthRecordsRouter.use(authenticate, requirePermission(PERMISSIONS.HEALTH_RECORD_MANAGE_OWN));
healthRecordsRouter.get('/', async (req, res) => ok(res, await service.healthOverview(getAuth(req))));
healthRecordsRouter.get('/documents', async (req, res) => {
  const query = parse(listHealthDocumentsSchema, req.query);
  const result = await service.listHealthDocuments(getAuth(req), query);
  paginated(res, result.data, query.page, query.pageSize, result.total);
});
healthRecordsRouter.post('/documents', async (req, res) => created(res, await service.uploadHealthDocument(getAuth(req), parse(uploadHealthDocumentSchema, req.body))));
healthRecordsRouter.delete('/documents/:id', async (req, res) => ok(res, await service.deleteHealthDocument(getAuth(req), parse(uuidParam, req.params).id)));
