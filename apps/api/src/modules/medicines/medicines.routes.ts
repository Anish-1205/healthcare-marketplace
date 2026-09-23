import { Router } from 'express';
import { ok, paginated, parse } from '../../utils/http';
import { listMedicinesQuery } from './medicines.schemas';
import * as medicinesService from './medicines.service';

export const medicinesRouter = Router();

medicinesRouter.get('/', async (req, res) => {
  const query = parse(listMedicinesQuery, req.query);
  const { data, total } = await medicinesService.listMedicines(query);
  paginated(res, data, query.page, query.pageSize, total);
});

medicinesRouter.get('/:id', async (req, res) => {
  ok(res, await medicinesService.getMedicineDetail(req.params.id));
});
