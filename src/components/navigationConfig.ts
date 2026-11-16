import type { Tab } from '../types/types';

/** Screen title shown in the header for each tab. */
export const TAB_TITLES: Record<Tab, string> = {
  'daily-log': 'Daily log',
  pantry: 'Pantry',
  sales: 'Sales',
  transactions: 'Ledger',
  flock: 'Flock',
  reports: 'Reports',
};

/** Tabs in the bottom bar, in order. Everything else lives in the header "More" menu. */
export const BOTTOM_TABS: Tab[] = ['daily-log', 'pantry', 'sales', 'transactions'];
export const MENU_TABS: Tab[] = ['flock', 'reports'];
