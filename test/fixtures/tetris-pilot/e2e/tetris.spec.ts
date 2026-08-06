import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const artifactDir = 'artifacts';

test.beforeAll(async () => {
  await mkdir(artifactDir, { recursive: true });
});

test('design workflow exposes fifteen theme candidates and a detail page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/__ux/themes');
  await expect(page.locator('[data-theme-id]')).toHaveCount(15);
  await page.screenshot({ path: `${artifactDir}/theme-gallery.png`, fullPage: true });
  await page.locator('[data-theme-id="neon-arcade"] a').click();
  await expect(page.getByRole('heading', { name: 'Neon Arcade' })).toBeVisible();
  await expect(page.getByText('No real mock data is used in this phase.')).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/theme-neon-arcade.png`, fullPage: true });
});

test('simple falling-block pilot responds to controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const board = page.getByRole('grid', { name: 'Falling block board' });
  await expect(board).toBeVisible();
  const before = await board.getAttribute('data-active-x');
  await page.getByRole('button', { name: 'Move left' }).click();
  await expect(board).not.toHaveAttribute('data-active-x', before ?? '');
  await page.getByRole('button', { name: 'Rotate' }).click();
  await page.getByRole('button', { name: 'Hard drop' }).click();
  await expect(board).not.toHaveAttribute('data-score', '0');
  await page.screenshot({ path: `${artifactDir}/tetris-playing.png`, fullPage: true });
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(board).toHaveAttribute('data-score', '0');

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `${artifactDir}/tetris-mobile.png`, fullPage: true });
});
