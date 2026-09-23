import { Router } from 'express';
import { created, parse } from '../../utils/http';
import { doctorOnboardingSchema, organizationOnboardingSchema } from './onboarding.schemas';
import * as onboardingService from './onboarding.service';

/** Public provider registration. New providers start in PENDING_APPROVAL. */
export const onboardingRouter = Router();

onboardingRouter.post('/doctor', async (req, res) => {
  const input = parse(doctorOnboardingSchema, req.body);
  created(res, await onboardingService.registerDoctor(input, req.ip));
});

onboardingRouter.post('/organization', async (req, res) => {
  const input = parse(organizationOnboardingSchema, req.body);
  created(res, await onboardingService.registerOrganization(input, req.ip));
});
