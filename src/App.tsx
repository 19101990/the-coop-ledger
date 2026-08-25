import { useState } from 'react';
import { Header, SidebarMenu } from './components/Navigation';
import DailyLog from './components/DailyLog';
import PantryManager from './components/PantryManager';
import SalesTracker from './components/SalesTracker';
import FlockManager from './components/FlockManager';
import Reports from './components/Reports';
import type { Tab } from './types/types';
import { DemoProvider } from './context/DemoContext';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('daily-log');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <DemoProvider>
      <div className="min-h-screen bg-stone-50 text-stone-800 antialiased">
        <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

        {isMenuOpen && (
          <SidebarMenu 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            setIsMenuOpen={setIsMenuOpen} 
          />
        )}

        <main className="max-w-md mx-auto px-4 py-6">
          {activeTab === 'daily-log' && <DailyLog />}
          {activeTab === 'pantry' && <PantryManager />}
          {activeTab === 'sales' && <SalesTracker />}
          {activeTab === 'flock' && <FlockManager />}
          {activeTab === 'reports' && <Reports />}
        </main>
      </div>
    </DemoProvider>
  );
}

export default App;