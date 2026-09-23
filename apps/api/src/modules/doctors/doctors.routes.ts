import { Router } from 'express';
import { ok, paginated, parse } from '../../utils/http';
import { doctorMeRouter } from './doctor-me.routes';
import { listDoctorsQuery, slotsQuery } from './doctors.schemas';
import * as doctorsService from './doctors.service';

export const doctorsRouter = Router();

doctorsRouter.get('/', async (req, res) => {
  const query = parse(listDoctorsQuery, req.query);
  const { data, total } = await doctorsService.listDoctors(query);
  paginated(res, data, query.page, query.pageSize, total);
});

// Self-service routes (`/doctors/me/...`) are registered before the `/:id` catch-alls below, or a
// literal "me" segment would be parsed as a doctor id/slug. Mounting them under `/me` also keeps
// that router's `authenticate` middleware off the public catalogue routes.
doctorsRouter.use('/me', doctorMeRouter);

doctorsRouter.get('/:id/slots', async (req, res) => {
  const { date } = parse(slotsQuery, req.query);
  ok(res, await doctorsService.getDoctorSlots(req.params.id, new Date(`${date}T00:00:00Z`)));
});

doctorsRouter.get('/:id', async (req, res) => {
  ok(res, await doctorsService.getDoctorDetail(req.params.id));
});
