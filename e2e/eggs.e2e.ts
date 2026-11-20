import { expect, test } from '@playwright/test';
import { formatWeekdayDate, todayLocal } from '../src/utils/format.ts';
import { goToTab, readPantry, watchErrors } from './helpers.ts';

test('logging eggs adds a history entry and puts them in the pantry', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  const before = await readPantry(page);

  // An unusual total, so the row can't be mistaken for a sample entry from the same day.
  await page.getByRole('button', { name: 'Add daily log' }).click();
  const sheet = page.getByRole('dialog', { name: 'Daily egg log' });
  for (let i = 0; i < 20; i++) await sheet.getByRole('button', { name: 'More Brown' }).click();
  for (let i = 0; i < 17; i++) await sheet.getByRole('button', { name: 'More Blue' }).click();
  await sheet.getByLabel('Notes').fill('E2E log');
  await expect(sheet).toContainText('37 eggs');
  await sheet.getByRole('button', { name: 'Save daily log' }).click();
  await expect(sheet).toBeHidden();

  await goToTab(page, 'Eggs');
  const row = page.locator('summary').filter({ hasText: formatWeekdayDate(todayLocal()) }).filter({ hasText: '37 eggs' });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(page.getByText('E2E log')).toBeVisible();

  // Nothing was packed into boxes, so all 37 are loose.
  const after = await readPantry(page);
  expect(after.loose).toBe(before.loose + 37);
  expect(after.forSale).toBe(before.forSale);

  expect(errors).toEqual([]);
});
