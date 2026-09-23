import { Router } from 'express';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, parse, uuidParam } from '../../utils/http';
import { addressSchema, updateProfileSchema } from './profile.schemas';
import * as service from './profile.service';

export const profileRouter = Router();
profileRouter.use(authenticate, requirePermission('patient.profile.manage'));
profileRouter.get('/', async (req, res) => ok(res, await service.getProfile(getAuth(req))));
profileRouter.patch('/', async (req, res) => ok(res, await service.updateProfile(getAuth(req), parse(updateProfileSchema, req.body))));
profileRouter.get('/addresses', async (req, res) => ok(res, await service.listAddresses(getAuth(req))));
profileRouter.post('/addresses', async (req, res) => created(res, await service.createAddress(getAuth(req), parse(addressSchema, req.body))));
profileRouter.put('/addresses/:id', async (req, res) =>
  ok(res, await service.updateAddress(getAuth(req), parse(uuidParam, req.params).id, parse(addressSchema, req.body))),
);
profileRouter.delete('/addresses/:id', async (req, res) => ok(res, await service.deleteAddress(getAuth(req), parse(uuidParam, req.params).id)));
