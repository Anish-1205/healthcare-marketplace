import { Router } from 'express';
import { ordersRouter } from '../modules/orders/orders.routes';
import { deliveriesRouter } from '../modules/deliveries/deliveries.routes';
import { paymentsRouter } from '../modules/payments/payments.routes';
import { prisma } from '../config/prisma';
import { appointmentsRouter } from '../modules/appointments/appointments.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { cartRouter } from '../modules/cart/cart.routes';
import { consultationsRouter } from '../modules/consultations/consultations.routes';
import { prescriptionsRouter } from '../modules/prescriptions/prescriptions.routes';
import { demoRouter } from '../modules/demo/demo.routes';
import { doctorsRouter } from '../modules/doctors/doctors.routes';
import { medicinesRouter } from '../modules/medicines/medicines.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { onboardingRouter } from '../modules/onboarding/onboarding.routes';
import { organizationsRouter } from '../modules/organizations/organizations.routes';
import { pharmaciesRouter } from '../modules/pharmacies/pharmacies.routes';
import { referenceRouter } from '../modules/reference/reference.routes';
import { searchRouter } from '../modules/search/search.routes';
import { ok } from '../utils/http';
import { adminRouter } from '../modules/admin/admin.routes';
import { healthRecordsRouter, labBookingsRouter, labTestsRouter } from '../modules/labs/labs.routes';

export const apiV1 = Router();

apiV1.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  ok(res, { status: 'ok', time: new Date().toISOString() });
});

apiV1.use('/auth', authRouter);
apiV1.use('/onboarding', onboardingRouter);
apiV1.use('/search', searchRouter);
apiV1.use('/notifications', notificationsRouter);
apiV1.use('/demo', demoRouter);
apiV1.use('/doctors', doctorsRouter);
apiV1.use('/appointments', appointmentsRouter);
apiV1.use('/consultations', consultationsRouter);
apiV1.use('/prescriptions', prescriptionsRouter);
apiV1.use('/organizations', organizationsRouter);
apiV1.use('/pharmacies', pharmaciesRouter);
apiV1.use('/medicines', medicinesRouter);
apiV1.use('/cart', cartRouter);
apiV1.use('/orders', ordersRouter);
apiV1.use('/deliveries', deliveriesRouter);
apiV1.use('/payments', paymentsRouter);
apiV1.use('/admin', adminRouter);
apiV1.use('/lab-tests', labTestsRouter);
apiV1.use('/lab-bookings', labBookingsRouter);
apiV1.use('/health-records', healthRecordsRouter);
apiV1.use('/', referenceRouter); // /config, /specialties, /medicine-categories
