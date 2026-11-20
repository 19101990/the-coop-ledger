import { expect, test } from '@playwright/test';
import { goToTab, ledgerEntry, readPantry, recentSale, recordSale, watchErrors } from './helpers.ts';

// Each test gets a fresh browser, so it starts from fresh demo sample data.

test('recording a sale updates Recent sales, the pantry and the Ledger', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const before = await readPantry(page);

  await recordSale(page, 12);
  await expect(recentSale(page)).toContainText('12 eggs');
  await expect(recentSale(page)).toContainText('€6,00');

  const after = await readPantry(page);
  expect(after.saleableEggs).toBe(before.saleableEggs - 12);
  expect(after.personal).toBe(before.personal);

  await goToTab(page, 'Ledger');
  await expect(ledgerEntry(page, 12)).toBeVisible();

  expect(errors).toEqual([]);
});

test('editing a sale moves the pantry and Ledger to the new numbers', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const before = await readPantry(page);
  await recordSale(page, 12);

  await recentSale(page).click();
  const sheet = page.getByRole('dialog', { name: 'Edit sale' });
  await sheet.getByLabel('Eggs sold').fill('20');
  await sheet.getByLabel('Price').fill('10');
  await sheet.getByRole('button', { name: 'Save · €10,00' }).click();
  await expect(sheet).toBeHidden();

  await expect(recentSale(page)).toContainText('20 eggs');
  await expect(recentSale(page)).toContainText('€10,00');

  const after = await readPantry(page);
  expect(after.saleableEggs).toBe(before.saleableEggs - 20);

  await goToTab(page, 'Ledger');
  await expect(ledgerEntry(page, 20)).toBeVisible();
  await expect(ledgerEntry(page, 12)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('deleting a sale puts the eggs back and removes the income entry', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const before = await readPantry(page);
  await recordSale(page, 12);
  await goToTab(page, 'Ledger');
  await expect(ledgerEntry(page, 12)).toBeVisible();

  await goToTab(page, 'Sales');
  await recentSale(page).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('dialog', { name: 'Edit sale' }).getByRole('button', { name: 'Delete sale' }).click();
  await expect(recentSale(page)).toHaveCount(0);

  const after = await readPantry(page);
  expect(after.saleableEggs).toBe(before.saleableEggs);

  await goToTab(page, 'Ledger');
  await expect(ledgerEntry(page, 12)).toHaveCount(0);

  expect(errors).toEqual([]);
});
