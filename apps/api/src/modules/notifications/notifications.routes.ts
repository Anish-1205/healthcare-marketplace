import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { authenticate, getAuth } from '../../middleware/auth';
import { notFound } from '../../utils/errors';
import { ok, paginated, paginationQuery, parse, toSkipTake, uuidParam } from '../../utils/http';
import { booleanQuery } from '../../utils/query';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

const listQuery = paginationQuery.extend({ unread: booleanQuery.optional() });

// Every query is scoped to the signed-in user — users can only ever see their own notifications.

notificationsRouter.get('/', async (req, res) => {
  const { userId } = getAuth(req);
  const query = parse(listQuery, req.query);
  const where = { userId, ...(query.unread ? { isRead: false } : {}) };

  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...toSkipTake(query) }),
    prisma.notification.count({ where }),
  ]);
  paginated(res, items, query.page, query.pageSize, total);
});

notificationsRouter.get('/unread-count', async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: getAuth(req).userId, isRead: false } });
  ok(res, { count });
});

notificationsRouter.post('/read-all', async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: getAuth(req).userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  ok(res, { updated: result.count });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  const { id } = parse(uuidParam, req.params);
  const { userId } = getAuth(req);
  // Filtering by userId makes another user's notification indistinguishable from a missing one.
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
  if (result.count === 0) throw notFound('Notification');
  ok(res, { id, isRead: true });
});
