import { useState } from 'react';
import { Header, BottomNav, MoreMenu } from './components/Navigation';
import { TAB_TITLES } from './components/navigationConfig';
import DailyLog from './pages/DailyLog';
import PantryManager from './pages/PantryManager';
import SalesTracker from './pages/SalesTracker';
import FlockManager from './pages/FlockManager';
import Reports from './pages/Reports';
import TransactionsTracker from './pages/TransactionsTracker';
import LoadingSpinner from './components/LoadingSpinner';
import type { Tab } from './types/types';
import { DemoProvider, useDemo } from './context/DemoContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('daily-log');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDemo, authReady } = useDemo();

  const goTo = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-[440px] bg-app pb-24 shadow-[0_0_0_1px_var(--color-edge)]">
      <Header title={TAB_TITLES[activeTab]} onOpenMenu={() => setIsMenuOpen(true)} />

      {/* Don't render any page until we know whether the user is signed in, and remount
          everything when the mode changes so live data never lingers after sign-out. */}
      <main key={isDemo ? 'demo' : 'live'} className="p-5">
        {!authReady ? (
          <LoadingSpinner message="Loading..." size="md" />
        ) : (
          <>
            {activeTab === 'daily-log' && <DailyLog />}
            {activeTab === 'pantry' && <PantryManager />}
            {activeTab === 'sales' && <SalesTracker />}
            {activeTab === 'transactions' && <TransactionsTracker />}
            {activeTab === 'flock' && <FlockManager />}
            {activeTab === 'reports' && <Reports />}
          </>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={goTo} />

      <MoreMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} activeTab={activeTab} setActiveTab={goTo} />
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
