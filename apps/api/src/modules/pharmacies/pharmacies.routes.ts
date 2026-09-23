import { Router } from 'express';
import { ok, paginated, parse } from '../../utils/http';
import { listOrganizations, getOrganizationDetail } from '../organizations/organizations.service';
import { listPharmaciesQuery } from '../organizations/organizations.schemas';

/** Pharmacy discovery — a pharmacy is an Organization of type PHARMACY. */
export const pharmaciesRouter = Router();

pharmaciesRouter.get('/', async (req, res) => {
  const query = parse(listPharmaciesQuery, req.query);
  const { data, total } = await listOrganizations({ ...query, type: undefined }, 'PHARMACY');
  paginated(res, data, query.page, query.pageSize, total);
});

pharmaciesRouter.get('/:id', async (req, res) => {
  ok(res, await getOrganizationDetail(req.params.id, 'PHARMACY'));
});
