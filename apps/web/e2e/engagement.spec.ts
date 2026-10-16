import { API_URL as API, WEB_URL } from './environment';
import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const requireApi = createRequire(path.resolve(process.cwd(), '../api/package.json'));
function fixture(input: object) {
  execFileSync(process.execPath, [requireApi.resolve('tsx/cli'), 'tests/engagement-fixture.ts', JSON.stringify(input)], { cwd: path.resolve(process.cwd(), '../api'), env: process.env, stdio: 'pipe', timeout: 20_000 });
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

for (const targetType of ['DOCTOR', 'CLINIC', 'HOSPITAL', 'PHARMACY']) {
  test(`${targetType}: save, review, moderate, public visibility and unsave`, async ({ page, request, browser }) => {
    test.setTimeout(60_000);
    const registration = await request.post(`${API}/auth/register`, { data: { email: `e2e.engagement.${crypto.randomUUID()}@example.demo`, password: 'Secure@2026', firstName: 'Review', lastName: 'Tester', phone: '+91 98450 10101', dateOfBirth: '1992-04-18', gender: 'MALE' } });
    expect(registration.status()).toBe(201);
    const patient = (await registration.json()).data;
    const doctor = (await (await request.get(`${API}/doctors?pageSize=1`)).json()).data[0];
    const provider = targetType === 'DOCTOR' ? doctor : (await (await request.get(`${API}/organizations?type=${targetType}&pageSize=1`)).json()).data[0];
    const target = { targetType, targetId: provider.id };
    const route = `/${targetType === 'DOCTOR' ? 'doctors' : targetType === 'PHARMACY' ? 'pharmacies' : 'organizations'}/${provider.id}`;
    const fixtureInput = { patientId: patient.user.patientId, doctorId: doctor.id, targetId: provider.id, targetType };
    const text = `Attentive care ${crypto.randomUUID()}`;
    try {
      await login(page, patient.user.email, 'Secure@2026');
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Save', exact: true }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Write a review' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Save', exact: true }).first().click();
      await expect(page.getByRole('button', { name: 'Unsave', exact: true }).first()).toBeVisible();
      await page.goto('/favorites');
      await expect(page.locator(`a[href$="/${provider.slug}"]`)).toBeVisible();
      await page.locator(`a[href$="/${provider.slug}"]`).click();
      await expect(page).toHaveURL(new RegExp(provider.slug));
      fixture({ ...fixtureInput, action: 'visit' });
      await page.reload();
      await page.getByLabel('Rating', { exact: true }).selectOption('4');
      await page.getByLabel('Your review', { exact: true }).fill(text);
      const submitted = page.waitForResponse((response) => response.url().endsWith('/reviews') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Submit review' }).click();
      const response = await submitted;
      expect(response.status()).toBe(201);
      const review = (await response.json()).data;
      await expect(page.getByRole('status')).toContainText('pending');
      const publicPending = await request.get(`${API}/reviews`, { params: target });
      expect((await publicPending.json()).data.some((r: { id: string }) => r.id === review.id)).toBe(false);
      const adminContext = await browser.newContext({ baseURL: WEB_URL });
      try {
        const adminPage = await adminContext.newPage();
        await login(adminPage, 'admin@carebridge.demo', 'Demo@123');
        await adminPage.goto('/admin/reviews');
        const item = adminPage.locator('article').filter({ hasText: text });
        await item.getByRole('button', { name: 'Approve', exact: true }).click();
        await expect(item).toContainText('approved');
      } finally { await adminContext.close(); }
      await page.goto(route);
      await expect(page.getByRole('status')).toContainText('approved');
      const approved = await request.get(`${API}/reviews`, { params: target });
      expect((await approved.json()).data.some((r: { id: string }) => r.id === review.id)).toBe(true);
      await page.goto('/favorites');
      await page.getByRole('button', { name: 'Unsave', exact: true }).click();
      await expect(page.getByText(/No saved providers yet/)).toBeVisible();
    } finally {
      fixture({ ...fixtureInput, action: 'cleanup' });
    }
  });
}
