import { test, expect } from '@playwright/test';

test('design workflow exposes the clean B2C foundation, 15 treatments, detail view, and gated prototype', async ({ page }) => {
  await page.goto('/__ux');
  await expect(page.getByRole('heading', { name: /Clean B2C foundation before components/i })).toBeVisible();

  await page.goto('/__ux/themes');
  await expect(page.locator('[data-theme-id]')).toHaveCount(15);
  await expect(page.getByText('15 clean B2C SaaS variants')).toBeVisible();

  await page.locator('[data-theme-id="apple-glass-controls"]').getByRole('link', { name: /Open full preview/i }).click();
  await expect(page.getByRole('heading', { name: /Apple Glass Controls/i })).toBeVisible();
  await expect(page.getByText(/Human approval/i)).toBeVisible();

  await page.goto('/__ux/prototype');
  await expect(page.getByRole('heading', {
    name: /Approve a UI treatment before mock-data UX work|Approved-treatment product prototype/i,
  })).toBeVisible();
});

test('health route exposes generated profile identity', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(typeof body.profileHash).toBe('string');
});
