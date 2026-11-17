import { useCallback, useState } from 'react';
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

  const goTo = (tab: Tab, from: 'left' | 'right' | null = null) => {
    setActiveTab(tab);
    setSlideFrom(from);
    window.scrollTo({ top: 0 });
  };

  // Swipe between the bottom bar tabs; stops at either end. Flock/Reports (More menu) don't swipe.
  const swipeBy = (step: 1 | -1) => {
    const i = SWIPE_TABS.indexOf(activeTab);
    const next = SWIPE_TABS[i + step];
    if (i === -1 || !next) return;
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
    <div className="relative mx-auto min-h-screen max-w-[440px] bg-app pb-24 shadow-[0_0_0_1px_var(--color-edge)]">
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
      <main key={`page-${isDemo ? 'demo' : 'live'}-${dataVersion}`} className="overflow-x-clip p-5" {...swipeHandlers}>
        {!authReady ? (
          <LoadingSpinner message="Loading..." size="md" />
        ) : (
          // Keyed by tab so the slide-in replays on every swipe.
          <div
            key={activeTab}
            className={
              slideFrom === 'right'
                ? 'motion-safe:animate-slide-from-right'
                : slideFrom === 'left'
                  ? 'motion-safe:animate-slide-from-left'
                  : undefined
            }
          >
            {activeTab === 'overview' && <Overview month={month} onViewLedger={() => goTo('transactions')} />}
            {activeTab === 'sales' && <SalesTracker />}
            {activeTab === 'eggs' && <DailyLog onAdd={() => openLogSheet()} onEdit={(log) => openLogSheet(log)} />}
            {activeTab === 'transactions' && <TransactionsTracker />}
            {activeTab === 'flock' && <FlockManager />}
            {activeTab === 'reports' && <Reports />}
          </div>
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
