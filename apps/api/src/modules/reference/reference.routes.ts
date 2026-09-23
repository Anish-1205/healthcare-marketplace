import { Router } from 'express';
import { DEMO_DISCLAIMER, type PublicConfig } from '@carebridge/shared';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/http';
import { PLATFORM_TIMEZONE } from '../../utils/time';

/** Public reference data shared by every portal. */
export const referenceRouter = Router();

referenceRouter.get('/config', async (_req, res) => {
  const settings = await prisma.platformSetting.findMany();
  const value = (key: string) => settings.find((setting) => setting.key === key)?.value;
  const config: PublicConfig = {
    marketplaceName: value('marketplace.name') ?? 'CareBridge',
    currency: 'INR',
    timezone: PLATFORM_TIMEZONE,
    platformFee: Number(value('orders.platformFee') ?? 5),
    defaultDeliveryFee: Number(value('orders.defaultDeliveryFee') ?? 30),
    supportEmail: value('support.email') ?? 'support@carebridge.demo',
    disclaimer: value('demo.disclaimer') ?? DEMO_DISCLAIMER,
    demoMode: env.DEMO_MODE,
  };
  ok(res, config);
});

referenceRouter.get('/specialties', async (_req, res) => {
  const specialties = await prisma.specialty.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      description: true,
      _count: { select: { doctors: { where: { doctor: { approvalStatus: 'APPROVED', isActive: true } } } } },
    },
  });
  ok(
    res,
    specialties.map(({ _count, ...specialty }) => ({ ...specialty, doctorCount: _count.doctors })),
  );
});

referenceRouter.get('/medicine-categories', async (_req, res) => {
  const categories = await prisma.medicineCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      colorTheme: true,
      imageUrl: true,
      description: true,
      _count: { select: { medicines: { where: { isActive: true } } } },
    },
  });
  ok(
    res,
    categories.map(({ _count, ...category }) => ({ ...category, medicineCount: _count.medicines })),
  );
});
