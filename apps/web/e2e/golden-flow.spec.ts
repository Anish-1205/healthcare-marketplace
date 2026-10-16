import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, account: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `${account} Demo`, exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

// Every workflow mutation goes through the UI and real API. Each role has its own
// browser context; global setup migrates/seeds carebridge_test before the suite.
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`golden flow: booking to delivery (${viewport.width}px)`, async ({ browser }) => {
    test.setTimeout(120_000);
    const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext({ viewport, timezoneId: 'Asia/Kolkata' })));
    const [patient, doctor, pharmacy, admin] = await Promise.all(contexts.map((context) => context.newPage()));
    const errors: string[] = [];
    for (const page of [patient, doctor, pharmacy, admin]) {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.url().includes('/api/v1/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
    }
    try {
      let appointmentId = '';
      let appointmentNumber = '';
      let prescriptionId = '';
      let orderId = '';
      let orderNumber = '';

      await test.step('Patient discovers Dr. Maya Rao and books with simulated UPI', async () => {
        await login(patient, 'Patient');
        await patient.goto('/doctors?q=Maya');
        await patient.getByRole('link', { name: /Dr\. Maya Rao/ }).first().click();
        await expect(patient.getByRole('heading', { name: 'Dr. Maya Rao', exact: true })).toBeVisible();
        // Pick a future day with availability, avoiding dependence on today's time.
        const dates = patient.locator('button').filter({ has: patient.locator('span.uppercase') });
        let selected = false;
        for (let i = 1; i < 14; i++) {
          const loaded = patient.waitForResponse((r) => r.url().includes('/slots?') && r.status() === 200);
          await dates.nth(i).click();
          await loaded;
          const slots = patient.getByRole('button', { name: /^\d{1,2}:\d{2}\s*(am|pm)$/i });
          await expect(slots.first().or(patient.getByText('No available slots on this date. Try another day.'))).toBeVisible();
          if (await slots.count()) {
            await slots.first().click();
            selected = true;
            break;
          }
        }
        expect(selected, 'A free slot within the next 14 days').toBe(true);
        await patient.getByRole('button', { name: 'Continue', exact: true }).click();
        await expect(patient).toHaveURL(/\/doctors\/[^/]+\/book$/);
        await patient.getByPlaceholder('e.g. Recurring headaches for the past two weeks').fill('Demo verification consultation');
        const booked = patient.waitForResponse((r) => r.url().endsWith('/appointments') && r.request().method() === 'POST');
        await patient.getByRole('button', { name: /Pay .* & confirm/ }).click();
        const response = await booked;
        expect(response.status()).toBe(201);
        const appointment = (await response.json()).data;
        appointmentId = appointment.id;
        appointmentNumber = appointment.appointmentNumber;
        expect(appointment.status).toBe('CONFIRMED');
        expect(appointment.payment.status).toBe('PAID');
        await expect(patient).toHaveURL(new RegExp(`/appointments/${appointmentId}$`));
        await capture(patient, 'patient-booking');
      });

      await test.step('Doctor writes notes, creates a prescription, and completes the consultation', async () => {
        await login(doctor, 'Doctor');
        await doctor.goto('/doctor/appointments');
        // The booked slot may be outside today's default list filter.
        await doctor.goto(`/doctor/appointments/${appointmentId}`);
        await expect(doctor.getByText(appointmentNumber).first()).toBeVisible();
        await doctor.getByRole('button', { name: 'Start consultation', exact: true }).click();
        await expect(doctor).toHaveURL(/\/doctor\/consultations\/[^/]+$/);
        await doctor.getByLabel('Diagnosis', { exact: true }).fill('Demo skin consultation');
        const notesSaved = doctor.waitForResponse((r) => r.url().includes('/consultations/') && r.request().method() === 'PATCH');
        await doctor.getByLabel('Diagnosis', { exact: true }).press('Tab');
        expect((await notesSaved).ok()).toBe(true);
        await doctor.getByRole('button', { name: 'Add medicine', exact: true }).click();
        await doctor.getByPlaceholder('Search medicines by name or salt').fill('Hydrocortisone');
        await doctor.getByRole('button', { name: /Hydrocortisone/ }).click();
        await doctor.getByLabel('Dosage', { exact: true }).fill('Demo application');
        await doctor.getByLabel('Frequency', { exact: true }).fill('Demo frequency');
        await doctor.getByLabel('Duration', { exact: true }).fill('Demo duration');
        const prescribed = doctor.waitForResponse((r) => r.url().endsWith('/prescriptions') && r.request().method() === 'POST');
        await doctor.getByRole('button', { name: 'Add to prescription', exact: true }).click();
        const response = await prescribed;
        expect(response.status()).toBe(201);
        prescriptionId = (await response.json()).data.id;
        await doctor.getByRole('button', { name: 'Complete consultation', exact: true }).click();
        const completed = doctor.waitForResponse((r) => r.url().endsWith('/complete') && r.request().method() === 'POST');
        await doctor.getByRole('button', { name: 'Yes, complete', exact: true }).click();
        const consultation = (await (await completed).json()).data;
        expect(consultation.status).toBe('COMPLETED');
        expect(consultation.prescription.status).toBe('ISSUED');
        await expect(doctor.getByLabel('Diagnosis', { exact: true })).toBeDisabled();
        await capture(doctor, 'completed-consultation');
      });

      await test.step('Patient orders the issued medicine from City Care Pharmacy', async () => {
        await patient.goto('/prescriptions');
        await patient.locator(`a[href="/prescriptions/${prescriptionId}"]`).first().click();
        await patient.getByRole('link', { name: /Order Medicines/i }).click();
        const cityCare = patient.locator('div.rounded-2xl').filter({ has: patient.getByRole('link', { name: 'City Care Pharmacy', exact: true }) });
        await cityCare.getByRole('button', { name: 'Choose Pharmacy', exact: true }).click();
        await expect(patient).toHaveURL(/\/cart$/);
        await patient.getByRole('link', { name: /Proceed to Checkout/i }).click();
        await expect(patient).toHaveURL(/\/checkout$/);
        for (const [label, value] of [
          ['Recipient', 'Rahul Verma'], ['Phone', '9845010101'], ['Address line 1', '42 Demo Street'],
          ['Locality', 'Indiranagar'], ['City', 'Bengaluru'], ['Postal code', '560038'],
        ]) await patient.getByLabel(label, { exact: true }).fill(value);
        const placed = patient.waitForResponse((r) => r.url().endsWith('/orders') && r.request().method() === 'POST');
        await patient.getByRole('button', { name: 'Place Order', exact: true }).click();
        const response = await placed;
        expect(response.status()).toBe(201);
        const order = (await response.json()).data;
        orderId = order.id;
        orderNumber = order.orderNumber;
        expect(order.prescription.id).toBe(prescriptionId);
        expect(order.payments[0].status).toBe('PAID');
        await expect(patient.getByText('Thank you! Your order is placed.')).toBeVisible();
        await capture(patient, 'patient-order');
      });

      await test.step('Pharmacy reviews, prepares and delivers; patient sees every transition', async () => {
        await login(pharmacy, 'Pharmacy');
        await pharmacy.goto('/pharmacy/orders');
        await pharmacy.getByText(orderNumber, { exact: true }).click();
        await expect(pharmacy.getByRole('heading', { name: /^Prescription RX-/ })).toBeVisible();
        const steps = [
          ['Review prescription', 'Prescription review'], ['Confirm stock & pricing', 'Confirmed'],
          ['Preparing medicines', 'Preparing medicines'], ['Ready for pickup', 'Ready for pickup'],
          ['Assign demo delivery agent', 'Agent assigned'], ['Mark Picked up', 'Picked up'],
          ['Mark On the way', 'On the way'], ['Mark Delivered', 'Delivered'],
        ];
        for (const [button, label] of steps) {
          const changed = pharmacy.waitForResponse((r) => r.url().includes('/api/v1/') && r.request().method() === 'POST');
          await pharmacy.getByRole('button', { name: button, exact: true }).click();
          const response = await changed;
          expect(response.ok(), button).toBe(true);
          const detail = patient.waitForResponse((r) => r.url().endsWith(`/api/v1/orders/${orderId}`) && r.request().method() === 'GET');
          await patient.reload();
          const order = (await (await detail).json()).data;
          await expect(patient.getByText(label, { exact: true }).first()).toBeVisible();
          await expect(patient.getByText('The pharmacy will review and confirm your medicines.')).toHaveCount(0);
          if (button === 'Mark Delivered') {
            expect(order.status).toBe('DELIVERED');
            expect(order.statusHistory.map((h: { toStatus: string }) => h.toStatus)).toEqual([
              'PENDING', 'PRESCRIPTION_REVIEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED',
            ]);
            expect(order.delivery.statusHistory.map((h: { status: string }) => h.status)).toEqual(['ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED']);
            expect(order.statusHistory.every((h: { createdAt: string }) => Number.isFinite(Date.parse(h.createdAt)))).toBe(true);
          }
        }
        await capture(patient, 'patient-delivered-timeline');
      });

      await test.step('Platform admin sees the completed appointment and order', async () => {
        await login(admin, 'Platform Admin');
        await admin.goto('/admin/appointments');
        await expect(admin.getByText(appointmentNumber)).toBeVisible();
        await admin.goto('/admin/orders');
        await expect(admin.getByText(orderNumber, { exact: true })).toBeVisible();
        await capture(admin, 'admin-order');
      });
      expect(errors, 'Browser runtime and API errors').toEqual([]);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
