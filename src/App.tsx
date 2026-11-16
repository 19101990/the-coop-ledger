import { useState } from 'react';
import { Header, SidebarMenu } from './components/Navigation';
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

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
      <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      {isMenuOpen && (
        <SidebarMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setIsMenuOpen={setIsMenuOpen}
        />
      )}

      {/* Don't render any page until we know whether the user is signed in, and remount
          everything when the mode changes so live data never lingers after sign-out. */}
      <main key={isDemo ? 'demo' : 'live'} className="max-w-md mx-auto px-4 py-6">
        {!authReady ? (
          <LoadingSpinner message="Loading..." size="md" />
        ) : (
          <>
            {activeTab === 'daily-log' && <DailyLog />}
            {activeTab === 'pantry' && <PantryManager />}
            {activeTab === 'sales' && <SalesTracker />}
            {activeTab === 'flock' && <FlockManager />}
            {activeTab === 'transactions' && <TransactionsTracker />}
            {activeTab === 'reports' && <Reports />}
          </>
        )}
      </main>
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
