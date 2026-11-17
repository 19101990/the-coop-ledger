import type { Tab } from '../types/types';

/** Screen title shown in the header for each tab. */
export const TAB_TITLES: Record<Tab, string> = {
  overview: 'Overview',
  sales: 'Sales',
  eggs: 'Egg log',
  transactions: 'Ledger',
  flock: 'Flock',
  reports: 'Reports',
};

/** Label in the bottom bar (shorter than the header title where needed). */
export const NAV_LABELS: Partial<Record<Tab, string>> = {
  overview: 'Overview',
  sales: 'Sales',
  eggs: 'Eggs',
  transactions: 'Ledger',
};

/** Bottom bar: two tabs, the "+" button, two tabs. Everything else lives in the header "More" menu. */
export const BOTTOM_TABS_LEFT: Tab[] = ['overview', 'sales'];
export const BOTTOM_TABS_RIGHT: Tab[] = ['eggs', 'transactions'];
export const MENU_TABS: Tab[] = ['flock', 'reports'];

/** Order for swiping between screens: the bottom bar tabs left to right, then the menu pages. */
export const SWIPE_TABS: Tab[] = [...BOTTOM_TABS_LEFT, ...BOTTOM_TABS_RIGHT, ...MENU_TABS];
