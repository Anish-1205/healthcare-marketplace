import { API_URL as API, WEB_URL } from './environment';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';



interface Slot {
  start: string;
  organizationId: string | null;
  consultationTypes: string[];
}

// Avoids Dr. Maya Rao so the golden demo slot stays free.
async function bookAppointmentAsDemoPatient(request: APIRequestContext) {
  const login = await request.post(`${API}/auth/login`, { data: { email: 'patient@carebridge.demo', password: 'Demo@123' } });
  expect(login.ok()).toBe(true);
  const headers = { Authorization: `Bearer ${(await login.json()).data.token}` };

  const doctors = (await (await request.get(`${API}/doctors?pageSize=50`)).json()).data as { id: string; slug: string }[];
  for (const doctor of doctors.filter((d) => !d.slug.includes('maya-rao'))) {
    for (let offset = 1; offset <= 14; offset++) {
      const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
      const slots = (await (await request.get(`${API}/doctors/${doctor.id}/slots?date=${date}`)).json()).data as Slot[];
      const slot = slots[0];
      if (!slot) continue;
      const res = await request.post(`${API}/appointments`, {
        headers,
        data: {
          doctorId: doctor.id,
          organizationId: slot.organizationId,
          consultationType: slot.consultationTypes[0],
          scheduledStart: slot.start,
          reason: 'E2E admin ordering check',
          paymentMethod: 'UPI',
        },
      });
      expect(res.ok()).toBe(true);
      const { id, appointmentNumber } = (await res.json()).data as { id: string; appointmentNumber: string };
      return {
        appointmentNumber,
        cancel: async () => {
          await request.post(`${API}/appointments/${id}/cancel`, { headers, data: { reason: 'E2E cleanup' } });
        },
      };
    }
  }
  throw new Error('No bookable slot found for any non-golden doctor in the next 14 days.');
}

async function loginAs(page: Page, label: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

test.describe('manual regression walkthrough', () => {
  const accounts = [
    ['Patient Demo', '/'],
    ['Doctor Demo', '/doctor'],
    ['Clinic Demo', '/organization'],
    ['Hospital Demo', '/organization'],
    ['Pharmacy Demo', '/pharmacy/orders'],
    ['Platform Employee Demo', '/admin'],
    ['Platform Admin Demo', '/admin'],
    ['Super Admin Demo', '/admin'],
  ] as const;

  for (const [label, destination] of accounts) {
    test(`${label} lands in the correct portal`, async ({ page }) => {
      await loginAs(page, label);
      await expect(page).toHaveURL(new URL(destination, WEB_URL).toString());
    });
  }

  test('new patient booking appears on the first super-admin appointments page', async ({ page, request }) => {
    const booking = await bookAppointmentAsDemoPatient(request);
    try {
      await loginAs(page, 'Super Admin Demo');
      await page.goto('/admin/appointments');
      await expect(page.getByText(booking.appointmentNumber)).toBeVisible();
    } finally {
      await booking.cancel();
    }
  });

  test('patient bell opens the populated notification list', async ({ page }) => {
    await loginAs(page, 'Patient Demo');
    await page.getByRole('button', { name: 'Notifications', exact: true }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await expect(page.getByText('Appointment confirmed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/being built in an upcoming phase/i)).toHaveCount(0);
  });
});
