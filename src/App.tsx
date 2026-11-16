import { useCallback, useState } from 'react';
import { Header, BottomNav, MoreMenu } from './components/Navigation';
import { TAB_TITLES } from './components/navigationConfig';
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

  const goTo = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

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
      <main key={`page-${isDemo ? 'demo' : 'live'}-${dataVersion}`} className="p-5">
        {!authReady ? (
          <LoadingSpinner message="Loading..." size="md" />
        ) : (
          <>
            {activeTab === 'overview' && <Overview month={month} onViewLedger={() => goTo('transactions')} />}
            {activeTab === 'sales' && <SalesTracker />}
            {activeTab === 'eggs' && <DailyLog onEdit={(log) => openLogSheet(log)} />}
            {activeTab === 'transactions' && <TransactionsTracker />}
            {activeTab === 'flock' && <FlockManager />}
            {activeTab === 'reports' && <Reports />}
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
