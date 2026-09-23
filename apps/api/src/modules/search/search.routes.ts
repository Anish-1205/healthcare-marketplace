import { Router } from 'express';
import { z } from 'zod';
import { ok, parse } from '../../utils/http';
import { searchText } from '../../utils/query';
import { search } from './search.service';

export const searchRouter = Router();

searchRouter.get('/', async (req, res) => {
  const { q } = parse(z.object({ q: searchText }), req.query);
  ok(res, await search(q));
});
