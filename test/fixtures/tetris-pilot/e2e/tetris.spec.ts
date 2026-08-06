import { test, expect } from '@playwright/test';

test('design workflow exposes fifteen clean UI treatments and a detail page', async ({ page }) => {
  await page.goto('/__ux/themes');
  await expect(page.locator('[data-theme-id]')).toHaveCount(15);
  await page.locator('[data-theme-id="apple-glass-controls"] a').click();
  await expect(page.getByRole('heading', { name: 'Apple Glass Controls' })).toBeVisible();
  await expect(page.getByText(/same clean SaaS structure/i)).toBeVisible();
});

test('simple falling-block pilot responds to controls', async ({ page }) => {
  await page.goto('/');
  const board = page.getByRole('grid', { name: 'Falling block board' });
  await expect(board).toBeVisible();
  const before = await board.getAttribute('data-active-x');
  await page.getByRole('button', { name: 'Move left' }).click();
  await expect(board).not.toHaveAttribute('data-active-x', before ?? '');
  await page.getByRole('button', { name: 'Rotate' }).click();
  await page.getByRole('button', { name: 'Hard drop' }).click();
  await expect(board).not.toHaveAttribute('data-score', '0');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(board).toHaveAttribute('data-score', '0');
});
