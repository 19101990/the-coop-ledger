import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Header, BottomNav, MoreMenu } from './components/Navigation';
import { SWIPE_TABS, TAB_TITLES } from './components/navigationConfig';
import { useHorizontalSwipe } from './hooks/useHorizontalSwipe';
import DailyLogSheet from './components/DailyLogSheet';
import Overview from './pages/Overview';
import DailyLog from './pages/DailyLog';
import SalesTracker from './pages/SalesTracker';
import FlockManager from './pages/FlockManager';
import Reports from './pages/Reports';
import TransactionsTracker from './pages/TransactionsTracker';
import LoadingSpinner from './components/LoadingSpinner';
import type { DBLogEntry, Tab } from './types/types';
import { DemoProvider, useDemo } from './context/DemoContext';
import { currentYearMonth, formatMonthShort, isSameMonth, shiftMonth, type YearMonth } from './utils/format';

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
  // Bumped after the log sheet saves, to reload whatever screen is showing.
  const [dataVersion, setDataVersion] = useState(0);
  const { isDemo, authReady } = useDemo();

  // Set only by a swipe, so tapping the bottom bar switches screens without animation.
  const [slideFrom, setSlideFrom] = useState<'left' | 'right' | null>(null);

  // Every screen stays mounted (just hidden), so switching back shows it already filled in.
  // The ones you're not on are built shortly after startup, so the first screen loads on its own.
  const [warmTabs, setWarmTabs] = useState(false);
  useEffect(() => {
    if (!authReady) return;
    const timer = window.setTimeout(() => setWarmTabs(true), 400);
    return () => window.clearTimeout(timer);
  }, [authReady]);

  // Each screen remembers how far down you were.
  const scrollPositions = useRef<Partial<Record<Tab, number>>>({});

  const goTo = (tab: Tab, from: 'left' | 'right' | null = null) => {
    scrollPositions.current[activeTab] = window.scrollY;
    setActiveTab(tab);
    setSlideFrom(from);
  };

  useLayoutEffect(() => {
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
      <main key={`page-${isDemo ? 'demo' : 'live'}-${dataVersion}`} className="flex-1 overflow-x-clip p-5" {...swipeHandlers}>
        {/* flex-1: fills down to the bottom bar, so short pages can be swiped on their empty space too. */}
        {!authReady ? (
          <LoadingSpinner message="Loading..." size="md" />
        ) : (
          <>
            {SWIPE_TABS.map((id) => {
              const active = id === activeTab;
              if (!active && !warmTabs) return null;
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
                  {id === 'overview' && <Overview month={month} onViewLedger={() => goTo('transactions')} />}
                  {id === 'sales' && <SalesTracker />}
                  {id === 'eggs' && <DailyLog onAdd={() => openLogSheet()} onEdit={(log) => openLogSheet(log)} />}
                  {id === 'transactions' && <TransactionsTracker />}
                  {id === 'flock' && <FlockManager />}
                  {id === 'reports' && <Reports />}
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
            setDataVersion((v) => v + 1);
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
      <AppContent />
    </DemoProvider>
  );
}

export default App;
