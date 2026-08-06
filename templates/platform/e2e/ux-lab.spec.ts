import { test, expect } from '@playwright/test';

test('design workflow exposes SOUL, 15-theme gallery, detail view, and prototype route', async ({ page }) => {
  await page.goto('/__ux');
  await expect(page.getByRole('heading', { name: /Design philosophy before components/i })).toBeVisible();

  await page.goto('/__ux/themes');
  const cards = page.locator('[data-theme-id]');
  await expect(cards).toHaveCount(15);
  await expect(page.getByText('15 materially different directions')).toBeVisible();

  await page.locator('[data-theme-id="neon-arcade"]').getByRole('link', { name: /Open full preview/i }).click();
  await expect(page.getByRole('heading', { name: /Neon Arcade/i })).toBeVisible();
  await expect(page.getByText(/Human approval/i)).toBeVisible();

  await page.goto('/__ux/prototype');
  await expect(page.getByRole('heading', { name: /Approved-theme product prototype/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('health route exposes generated profile identity', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(typeof body.profileHash).toBe('string');
});
