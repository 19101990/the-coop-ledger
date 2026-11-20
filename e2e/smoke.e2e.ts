import { expect, test, type Page } from '@playwright/test';

/** Collect uncaught errors and console errors, so a test can check none happened. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

const title = (page: Page) => page.getByRole('heading', { level: 1 });
const bottomTab = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true });

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
  for (const [tab, heading] of [
    ['Sales', 'Sales'],
    ['Eggs', 'Egg log'],
    ['Ledger', 'Ledger'],
    ['Overview', 'Overview'],
  ]) {
    await bottomTab(page, tab).click();
    await expect(title(page)).toHaveText(heading);
  }

  // Header menu
  for (const screen of ['Flock', 'Reports']) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: screen, exact: true }).click();
    await expect(title(page)).toHaveText(screen);
  }

  expect(errors).toEqual([]);
});
