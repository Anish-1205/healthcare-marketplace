import { Router } from 'express';
import { z } from 'zod';
import { DEMO_ACCOUNTS, PERMISSIONS } from '@carebridge/shared';
import { devToolsEnabled, env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { seedDatabase } from '../../demo/seed';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { ACTIVITY, logActivity } from '../../services/activity-log.service';
import { AppError, notFound } from '../../utils/errors';
import { ok, parse } from '../../utils/http';

export const demoRouter = Router();

demoRouter.get('/status', (_req, res) => {
  ok(res, {
    demoMode: env.DEMO_MODE,
    devToolsEnabled,
    scenarioState: env.DEMO_SCENARIO_STATE,
    mockPayments: env.DEMO_MODE,
    simulatedDelivery: env.DEMO_MODE,
  });
});

demoRouter.get('/accounts', (_req, res) => {
  if (!env.DEMO_MODE) throw notFound('Demo accounts');
  ok(res, DEMO_ACCOUNTS);
});

let resetInProgress = false;

const resetSchema = z.object({
  scenarioState: z.enum(['ready', 'complete']).default(env.DEMO_SCENARIO_STATE),
});

demoRouter.post('/reset', authenticate, requirePermission(PERMISSIONS.DEMO_RESET), async (req, res) => {
  if (!devToolsEnabled) throw notFound('Demo reset');
  if (resetInProgress) throw new AppError(409, 'RESET_IN_PROGRESS', 'A demo data reset is already running.');

  const { scenarioState } = parse(resetSchema, req.body ?? {});
  const actorEmail = getAuth(req).email;

  resetInProgress = true;
  try {
    const summary = await seedDatabase(prisma, { scenarioState });
    // The acting user was recreated by the seed; attribute the log by email lookup.
    const actor = await prisma.user.findUnique({ where: { email: actorEmail }, select: { id: true } });
    await logActivity({
      action: ACTIVITY.DEMO_DATA_RESET,
      entityType: 'System',
      actorUserId: actor?.id,
      description: `Demo data reset (scenario: ${scenarioState})`,
    });
    ok(res, { reset: true, scenarioState, summary, note: 'All sessions are invalidated. Sign in again.' });
  } finally {
    resetInProgress = false;
  }
});
