import { expect, test } from '@playwright/test';
import { goToTab, title, watchErrors } from './helpers.ts';

test('opens on Overview in demo mode', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');

  await expect(title(page)).toHaveText('Overview');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByText('Sample data only — nothing is saved to the farm records.')).toBeVisible();

  expect(errors).toEqual([]);
});

test('every screen loads', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(title(page)).toHaveText('Overview');

  // Bottom bar
  for (const tab of ['Sales', 'Eggs', 'Ledger', 'Overview'] as const) {
    await goToTab(page, tab);
  }

  // Header menu
  for (const screen of ['Flock', 'Reports']) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: screen, exact: true }).click();
    await expect(title(page)).toHaveText(screen);
  }

  expect(errors).toEqual([]);
});
