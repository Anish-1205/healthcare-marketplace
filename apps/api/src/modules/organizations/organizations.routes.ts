import { Router } from 'express';
import { ok, paginated, parse } from '../../utils/http';
import { listOrganizationsQuery } from './organizations.schemas';
import * as organizationsService from './organizations.service';

export const organizationsRouter = Router();

organizationsRouter.get('/', async (req, res) => {
  const query = parse(listOrganizationsQuery, req.query);
  const { data, total } = await organizationsService.listOrganizations(query);
  paginated(res, data, query.page, query.pageSize, total);
});

organizationsRouter.get('/:id', async (req, res) => {
  ok(res, await organizationsService.getOrganizationDetail(req.params.id));
});
