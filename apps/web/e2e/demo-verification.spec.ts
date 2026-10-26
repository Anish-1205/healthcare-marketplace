import { API_URL } from './environment';
import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, label: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `${label} Demo`, exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await test.info().attach(name, { path, contentType: 'image/png' });
}

test('new pharmacy submits a document, receives approval and can sign in again', async ({ page, browser }) => {
  test.setTimeout(60_000);
  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  const errors: string[] = [];
  for (const tab of [page, reviewer]) tab.on('pageerror', (error) => errors.push(error.message));
  const stamp = Date.now();
  const name = `Verification Pharmacy ${stamp}`;
  const email = `verification.${stamp}@carebridge.demo`;
  try {
    await page.goto('/register/provider');
    await page.getByRole('button', { name: 'Pharmacy', exact: true }).click();
    for (const [label, value] of [
      ['First name', 'Demo'], ['Last name', 'Owner'], ['Email', email],
      ['Phone', '9845010101'], ['Password', 'Demo@123'], ['Organization name', name],
      ['Registration number', `VERIFY-${stamp}`], ['Business phone', '9845010101'],
      ['Business email', email], ['Address line 1', '42 Demo Street'],
      ['Locality', 'Indiranagar'], ['PIN code', '560038'],
    ]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByPlaceholder('registration-certificate.pdf').fill('verification-registration.pdf');
    const submitted = page.waitForResponse((r) => r.url().includes('/onboarding/') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Submit for approval' }).click();
    const response = await submitted;
    expect(response.status()).toBe(201);
    const membership = (await response.json()).data.user.memberships[0];
    expect(membership.approvalStatus).toBe('PENDING_APPROVAL');
    const pendingListing = await page.request.get(`${API_URL}/pharmacies?q=${encodeURIComponent(name)}`);
    expect(pendingListing.ok()).toBe(true);
    expect((await pendingListing.json()).data).toHaveLength(0);
    await expect(page.getByRole('status')).toContainText('Pending approval');
    await capture(page, 'pharmacy-pending');

    await login(reviewer, 'Platform Admin');
    await reviewer.goto('/admin/approvals');
    const card = reviewer.locator('div.rounded-2xl').filter({ has: reviewer.getByRole('heading', { name, exact: true }) });
    await expect(card).toContainText('verification-registration.pdf');
    const approved = reviewer.waitForResponse((r) => r.url().includes('/approve') && r.request().method() === 'POST');
    await card.getByRole('button', { name: 'Approve', exact: true }).click();
    expect((await approved).ok()).toBe(true);
    await expect(card).toHaveCount(0);
    const approvedListing = await page.request.get(`${API_URL}/pharmacies?q=${encodeURIComponent(name)}`);
    expect(approvedListing.ok()).toBe(true);
    expect((await approvedListing.json()).data.map((item: { id: string }) => item.id)).toContain(membership.organizationId);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Demo@123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/pharmacy\/orders$/);
    await expect(page.getByText(/Pending approval:/)).toHaveCount(0);
    await page.goto(`/pharmacies/${membership.organizationId}`);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await capture(page, 'pharmacy-approved');
    expect(errors).toEqual([]);
  } finally {
    await reviewerContext.close();
  }
});

test('clinic associates a doctor, saves a schedule and views operations and reports', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/api/v1/') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await login(page, 'Clinic');
  await expect(page.getByRole('heading', { name: 'Welcome to Sunrise Family Clinic' })).toBeVisible();
  await capture(page, 'clinic-dashboard');
  await page.goto('/organization/doctors');
  await page.getByRole('button', { name: 'Add doctor', exact: true }).click();
  await page.getByPlaceholder('doctor@carebridge.demo').fill('arjun.mehta@carebridge.demo');
  await page.getByPlaceholder('Consultant Dermatologist').fill('Demo visiting consultant');
  const added = page.waitForResponse((r) => r.url().endsWith('/organizations/me/doctors') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Associate doctor', exact: true }).click();
  const response = await added;
  expect(response.ok()).toBe(true);
  const doctor = (await response.json()).data;
  await expect(page.getByText('Demo visiting consultant', { exact: false })).toBeVisible();
  await page.goto('/organization/schedules');
  await page.getByRole('combobox').first().selectOption(doctor.doctorId);
  await page.getByLabel('Monday', { exact: true }).check();
  const monday = page.locator('div.rounded-xl').filter({ has: page.getByLabel('Monday', { exact: true }) });
  await monday.locator('input[type="time"]').nth(0).fill('10:00');
  await monday.locator('input[type="time"]').nth(1).fill('13:00');
  const saved = page.waitForResponse((r) => r.url().endsWith('/schedule') && r.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save schedule', exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await page.getByRole('combobox').first().selectOption(doctor.doctorId);
  await expect(monday.locator('input[type="time"]').nth(0)).toHaveValue('10:00');
  await expect(monday.locator('input[type="time"]').nth(1)).toHaveValue('13:00');
  await capture(page, 'clinic-schedule');
  await page.goto('/organization/appointments');
  await expect(page.locator('a[href^="/organization/appointments/"]').first()).toBeVisible();
  await page.goto('/organization/patients');
  await expect(page.getByText('Rahul Verma', { exact: true })).toBeVisible();
  await page.goto('/organization/reports');
  await expect(page.getByText('Daily activity', { exact: true })).toBeVisible();
  await expect(page.getByText('Doctor performance', { exact: true })).toBeVisible();
  await expect(page.getByText('Dr. Maya Rao', { exact: true })).toBeVisible();
  await capture(page, 'clinic-reports');
  expect(errors).toEqual([]);
});

for (const route of ['/doctors', '/medicines']) {
  test(`${route} pagination reaches the second page and survives reload`, async ({ page }) => {
    await page.goto(route);
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    const sort = page.getByRole('combobox').last();
    await sort.selectOption(route === '/doctors' ? 'fee' : 'mrp');
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByText(/Page 1 of/)).toBeVisible();
  });
}

for (const width of [1440, 390]) {
  test(`public homepage is populated and fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('a[href^="/doctors/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/medicines/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/pharmacies/"]').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(page, `homepage-${width}`);
  });
}
