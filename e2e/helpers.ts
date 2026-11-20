import { expect, type Page } from '@playwright/test';

/** Collect uncaught errors and console errors, so a test can check none happened. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** The screen title in the header. */
export const title = (page: Page) => page.getByRole('heading', { level: 1 });

/** Switch screens with the bottom bar. */
export async function goToTab(page: Page, tab: 'Overview' | 'Sales' | 'Eggs' | 'Ledger') {
  await page.getByRole('navigation').getByRole('button', { name: tab, exact: true }).click();
  await expect(title(page)).toHaveText(tab === 'Eggs' ? 'Egg log' : tab);
}

export interface PantryCounts {
  forSale: number;
  personal: number;
  loose: number;
  /** Eggs available to sell: boxes for sale × 10 + loose eggs. */
  saleableEggs: number;
}

/** Read the Pantry card on Overview (waits until it has loaded). */
export async function readPantry(page: Page): Promise<PantryCounts> {
  await goToTab(page, 'Overview');
  const grid = page.locator('div[aria-busy="false"]').filter({ hasText: 'For sale' });
  const cell = async (label: string) => {
    const text = await grid.locator('> div').filter({ hasText: label }).innerText();
    return Number(text.match(/\d+/)?.[0]);
  };
  const [forSale, personal, loose] = [await cell('For sale'), await cell('Personal'), await cell('Loose')];
  return { forSale, personal, loose, saleableEggs: forSale * 10 + loose };
}

export const CUSTOMER = 'E2E Tester';

/** Record a paid sale for the test customer on the Sales screen, at the default €0,50 per egg. */
export async function recordSale(page: Page, eggs: number) {
  await goToTab(page, 'Sales');
  await page.getByRole('button', { name: '+ Add customer' }).click();
  await page.getByPlaceholder('Customer name').fill(CUSTOMER);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByLabel('Eggs sold').fill(String(eggs));
  await page.getByRole('button', { name: /^Record sale · / }).click();
  await expect(recentSale(page)).toBeVisible();
}

/** The test customer's row in Recent sales. */
export const recentSale = (page: Page) => page.getByRole('button', { name: new RegExp(CUSTOMER) });

/**
 * The sale's income entry on the screen being shown. Screens stay mounted when hidden, and
 * Overview's recent entries list the same entry, so only count the visible one.
 */
export const ledgerEntry = (page: Page, eggs: number) =>
  page.getByText(`Sold ${eggs} eggs to ${CUSTOMER}`).filter({ visible: true });
