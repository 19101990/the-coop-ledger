import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Header, BottomNav, MoreMenu } from './components/Navigation';
import { SWIPE_TABS, TAB_TITLES } from './components/navigationConfig';
import { useHorizontalSwipe } from './hooks/useHorizontalSwipe';
import DailyLogSheet from './components/DailyLogSheet';
import Overview from './pages/Overview';
import LoadingSpinner from './components/LoadingSpinner';

// Overview is the start screen, so it's in the main bundle. The others load as separate files
// while they're warmed up in the background, keeping startup JavaScript smaller on mobile.
const DailyLog = lazy(() => import('./pages/DailyLog'));
const SalesTracker = lazy(() => import('./pages/SalesTracker'));
const FlockManager = lazy(() => import('./pages/FlockManager'));
const Reports = lazy(() => import('./pages/Reports'));
const TransactionsTracker = lazy(() => import('./pages/TransactionsTracker'));
import type { DBLogEntry, Tab } from './types/types';
import { DemoProvider, useDemo } from './context/DemoContext';
import { RefreshProvider, useRefresh } from './context/RefreshContext';
import { currentYearMonth, formatMonthShort, isSameMonth, shiftMonth, type YearMonth } from './utils/format';

/** Build the hidden screens this long after opening if the app hasn't been touched yet. */
const WARMUP_DELAY_MS = 5000;

interface LogSheetState {
  open: boolean;
  editing: DBLogEntry | null;
  /** Changes on every opening so the form starts fresh. */
  key: number;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [month, setMonth] = useState<YearMonth>(currentYearMonth);
  const [logSheet, setLogSheet] = useState<LogSheetState>({ open: false, editing: null, key: 0 });
  const { isDemo, authReady } = useDemo();
  const { notifyDataChanged } = useRefresh();

  // Set only by a swipe, so tapping the bottom bar switches screens without animation.
  const [slideFrom, setSlideFrom] = useState<'left' | 'right' | null>(null);

  // Every screen stays mounted (just hidden), so switching back shows it already filled in.
  // Startup builds only the screen you open on; the others follow one per idle moment, so no
  // single step blocks the main thread for long (all at once was a ~200ms task on mobile).
  const [mountedTabs, setMountedTabs] = useState<ReadonlySet<Tab>>(() => new Set([activeTab]));
  const mountTab = (tab: Tab) => setMountedTabs((s) => (s.has(tab) ? s : new Set(s).add(tab)));

  // The hidden screens aren't built during page load: building them (even hidden) counts as the page
  // still changing in mobile PageSpeed's Speed Index estimate. Building starts at the first touch,
  // tap, key or scroll — the start of a swipe is early enough — or after WARMUP_DELAY_MS untouched.
  const [warmupStarted, setWarmupStarted] = useState(false);
  useEffect(() => {
    if (warmupStarted) return;
    const start = () => setWarmupStarted(true);
    const events = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, start, { passive: true, capture: true }));
    const timer = window.setTimeout(start, WARMUP_DELAY_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, start, { capture: true }));
      window.clearTimeout(timer);
    };
  }, [warmupStarted]);

  useEffect(() => {
    if (!authReady || !warmupStarted) return;
    const next = SWIPE_TABS.find((t) => !mountedTabs.has(t));
    if (!next) return;

    // One screen per idle moment. Safari has no requestIdleCallback, so it falls back to a short timeout.
    let idleHandle: number | undefined;
    const timer = window.setTimeout(() => {
      const whenIdle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 50));
      idleHandle = whenIdle(() => mountTab(next), { timeout: 1000 });
    }, 50);
    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== undefined) (window.cancelIdleCallback ?? window.clearTimeout)(idleHandle);
    };
  }, [authReady, warmupStarted, mountedTabs]);

  // Each screen remembers how far down you were.
  const scrollPositions = useRef<Partial<Record<Tab, number>>>({});

  const goTo = (tab: Tab, from: 'left' | 'right' | null = null) => {
    scrollPositions.current[activeTab] = window.scrollY;
    mountTab(tab);
    setActiveTab(tab);
    setSlideFrom(from);
  };

  // Skipped on first render: there's nothing to restore yet, and scrollTo forces a full layout
  // inside the startup task (~140ms of blocking time on a throttled mobile load).
  const isFirstRender = useRef(true);
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: scrollPositions.current[activeTab] ?? 0 });
  }, [activeTab]);

  // Swipe through every screen in SWIPE_TABS order; stops at either end.
  const swipeBy = (step: 1 | -1) => {
    const next = SWIPE_TABS[SWIPE_TABS.indexOf(activeTab) + step];
    if (!next) return;
    goTo(next, step === 1 ? 'right' : 'left');
  };
  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => swipeBy(1),
    onSwipeRight: () => swipeBy(-1),
  });

  const openLogSheet = (editing: DBLogEntry | null = null) =>
    setLogSheet((s) => ({ open: true, editing, key: s.key + 1 }));
  const closeLogSheet = useCallback(() => setLogSheet((s) => ({ ...s, open: false })), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const atCurrentMonth = isSameMonth(month, currentYearMonth());

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col bg-app pb-24 shadow-[0_0_0_1px_var(--color-edge)]">
      <Header
        title={TAB_TITLES[activeTab]}
        onOpenMenu={() => setIsMenuOpen(true)}
        month={
          activeTab === 'overview'
            ? {
                label: formatMonthShort(month),
                onPrev: () => setMonth((m) => shiftMonth(m, -1)),
                onNext: () => setMonth((m) => shiftMonth(m, 1)),
                nextDisabled: atCurrentMonth,
              }
            : undefined
        }
      />

      {/* Don't render any page until we know whether the user is signed in, and remount
          everything when the mode changes so live data never lingers after sign-out. */}
      {/* Keys must be unique among siblings (main vs. the sheet below), otherwise React can
          leave the old page in the DOM — that showed stale demo data on every tab after login. */}
      <main key={`page-${isDemo ? 'demo' : 'live'}`} className="flex-1 overflow-x-clip p-5" {...swipeHandlers}>
        {/* flex-1: fills down to the bottom bar, so short pages can be swiped on their empty space too. */}
        {!authReady ? (
          <LoadingSpinner message="Loading..." size="md" />
        ) : (
          <>
            {SWIPE_TABS.map((id) => {
              const active = id === activeTab;
              if (!active && !mountedTabs.has(id)) return null;
              return (
                // Hidden panels are display:none, so the slide-in restarts each time one is shown again.
                <div
                  key={id}
                  hidden={!active}
                  className={
                    active && slideFrom === 'right'
                      ? 'motion-safe:animate-slide-from-right'
                      : active && slideFrom === 'left'
                        ? 'motion-safe:animate-slide-from-left'
                        : undefined
                  }
                >
                  {/* One boundary per screen, so a screen whose code is still loading doesn't blank the others. */}
                  <Suspense fallback={<LoadingSpinner message="Loading..." size="md" />}>
                    {id === 'overview' && <Overview month={month} onViewLedger={() => goTo('transactions')} />}
                    {id === 'sales' && <SalesTracker />}
                    {id === 'eggs' && <DailyLog onAdd={() => openLogSheet()} onEdit={(log) => openLogSheet(log)} />}
                    {id === 'transactions' && <TransactionsTracker />}
                    {id === 'flock' && <FlockManager />}
                    {id === 'reports' && <Reports />}
                  </Suspense>
                </div>
              );
            })}
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={goTo} onAdd={() => openLogSheet()} />

      {authReady && (
        <DailyLogSheet
          key={`log-sheet-${isDemo ? 'demo' : 'live'}-${logSheet.key}`}
          open={logSheet.open}
          editingLog={logSheet.editing}
          onClose={closeLogSheet}
          onSaved={() => {
            closeLogSheet();
            notifyDataChanged();
          }}
        />
      )}

      <MoreMenu open={isMenuOpen} onClose={closeMenu} activeTab={activeTab} setActiveTab={goTo} />
    </div>
  );
}

function App() {
  return (
    <DemoProvider>
      <RefreshProvider>
        <AppContent />
      </RefreshProvider>
    </DemoProvider>
  );
}

export default App;
