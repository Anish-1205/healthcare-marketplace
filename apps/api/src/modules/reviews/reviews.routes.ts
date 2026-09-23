import { Router } from 'express';
import { authenticate, getAuth, optionalAuth, requirePermission } from '../../middleware/auth';
import { created, ok, parse } from '../../utils/http';
import { createReviewSchema, reviewListSchema, targetSchema } from './reviews.schemas';
import * as service from './reviews.service';

export const reviewsRouter = Router();
// POST /reviews — patient submissions always begin PENDING.
reviewsRouter.post('/', authenticate, requirePermission('review.create'), async (req, res) => created(res, await service.createReview(getAuth(req), parse(createReviewSchema, req.body))));
reviewsRouter.get('/eligibility', authenticate, requirePermission('review.create'), async (req, res) => ok(res, await service.eligibility(getAuth(req), parse(targetSchema, req.query))));
reviewsRouter.get('/', optionalAuth, async (req, res) => {
  const query = parse(reviewListSchema, req.query);
  const own = query.mine === 'true' ? service.patientId(getAuth(req)) : undefined;
  ok(res, await service.listReviews(query.targetType && query.targetId ? { targetType: query.targetType, targetId: query.targetId } : undefined, own));
});
