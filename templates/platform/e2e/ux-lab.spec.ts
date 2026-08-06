import { test, expect } from '@playwright/test';

test('React UX Lab exposes critical B2C mock states without horizontal overflow', async ({ page }) => {
  await page.goto('/__ux');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const state of ['loading', 'empty', 'error', 'paidLimit']) {
    await page.getByRole('button', { name: state }).click();
    await expect(page.locator('[data-state]')).toBeVisible();
  }
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
