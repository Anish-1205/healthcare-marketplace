import { Router } from 'express';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { created, ok, parse, uuidParam } from '../../utils/http';
import { targetSchema } from '../reviews/reviews.schemas';
import * as service from './favorites.service';

export const favoritesRouter = Router();
favoritesRouter.use(authenticate, requirePermission('favorite.manage'));
favoritesRouter.get('/', async (req, res) => ok(res, await service.listFavorites(getAuth(req))));
// POST /favorites — idempotently save a provider for the signed-in patient.
favoritesRouter.post('/', async (req, res) => created(res, await service.addFavorite(getAuth(req), parse(targetSchema, req.body))));
favoritesRouter.delete('/:id', async (req, res) => ok(res, await service.removeFavorite(getAuth(req), parse(uuidParam, req.params).id)));
