import { expect, test, type Page } from '@playwright/test';

async function loginAsPatient(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Patient Demo', exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

test('homepage Video Consultation link filters doctors by video', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Video Consultation' }).click();
  await expect(page).toHaveURL(/\/doctors\?type=VIDEO/);
  await expect(page.getByRole('heading', { name: 'Video Consultations' })).toBeVisible();
  await expect(page.getByLabel('Consultation type')).toHaveValue('VIDEO');
});

test('footer links open real pages', async ({ page }) => {
  await page.goto('/');
  for (const [name, heading] of [
    ['About CareBridge', 'About CareBridge'],
    ['Contact', 'Contact'],
    ['Privacy Policy', 'Privacy Policy'],
    ['Terms of Service', 'Terms of Service'],
  ]) {
    await page.locator('footer').getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  }
});

test('patient edits their profile and manages a saved address', async ({ page }) => {
  await loginAsPatient(page);
  await page.goto('/profile');
  const relation = page.getByLabel('Relationship');
  await expect(page.getByLabel('Email')).toBeDisabled();
  const original = await relation.inputValue();
  const next = original === 'Sibling' ? 'Parent' : 'Sibling';
  await relation.fill(next);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Relationship')).toHaveValue(next);

  await page.getByRole('link', { name: 'Saved addresses' }).click();
  await expect(page).toHaveURL(/\/profile\/addresses$/);
  const label = `E2E ${Date.now()}`;
  await page.getByRole('button', { name: 'Add address' }).first().click();
  await page.getByLabel('Label (e.g. Home, Work)').fill(label);
  await page.getByLabel('Recipient name').fill('Demo Patient');
  await page.getByLabel('Phone').fill('+91 98450 10101');
  await page.getByLabel('Address line 1').fill('1 Test Street');
  await page.getByLabel('Locality').fill('Indiranagar');
  await page.getByLabel('City').fill('Bengaluru');
  await page.getByLabel('State').fill('Karnataka');
  await page.getByLabel('PIN code').fill('560038');
  await page.getByRole('button', { name: 'Save address' }).click();

  const card = page.locator('div.rounded-2xl', { hasText: label }).last();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Address line 1').fill('2 Edited Street');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expect(card).toContainText('2 Edited Street');

  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(label)).toHaveCount(0);
});
