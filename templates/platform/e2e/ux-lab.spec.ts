import { test, expect } from '@playwright/test';

test('design workflow compares one commercial product screen across fifteen practical treatments', async ({ page }) => {
  await page.goto('/__ux');
  await expect(page.getByRole('heading', { name: /React UX approval workflow/i })).toBeVisible();
  await expect(page.getByText(/IA, layout, content, and task remain fixed/i)).toBeVisible();

  await page.goto('/__ux/themes');
  await expect(page.locator('[data-theme-id]')).toHaveCount(15);
  await expect(page.getByRole('heading', { name: /Compare 15 practical UI treatments/i })).toBeVisible();
  await expect(page.getByText(/same screen/i)).toBeVisible();
  await expect(page.getByText(/fake metric/i)).toHaveCount(0);

  await page.locator('[data-theme-id="apple-glass-controls"]').getByRole('link', { name: /Open preview/i }).click();
  await expect(page.getByRole('heading', { name: /Apple Glass Controls/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Approve this treatment/i })).toBeVisible();
  await expect(page.getByText(/IA and user flow remain unchanged/i)).toBeVisible();

  await page.goto('/__ux/prototype');
  await expect(page.getByRole('heading', {
    name: /Approve a UI treatment first|Complete product mock/i,
  })).toBeVisible();
});

test('OnboardJS flow reaches first value with familiar controls and resumable local progress', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: /Set up your workspace/i })).toBeVisible();
  await page.getByRole('button', { name: /Continue/i }).click();

  await expect(page.getByRole('heading', { name: /What do you need to accomplish first/i })).toBeVisible();
  await page.getByLabel('Immediate goal').fill('Publish the first survey and collect a response');
  await page.getByRole('button', { name: /Continue/i }).click();

  await expect(page.getByRole('heading', { name: /Confirm the first product action/i })).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Finish/i }).click();
  await expect(page.getByRole('heading', { name: /Setup complete/i })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: /Setup complete/i })).toBeVisible();
});

test('health route exposes generated profile identity', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(typeof body.profileHash).toBe('string');
  expect(typeof body.codeReady).toBe('boolean');
});
