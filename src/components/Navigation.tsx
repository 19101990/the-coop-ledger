import type { Tab } from '../types/types';
import { useState, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { supabase } from '../supabaseClient';


interface HeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

export function LiveDatabaseToggle() {
  const { isDemo, setIsDemo } = useDemo();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsDemo(false);
    });
  }, [setIsDemo]);

  const handleToggleClick = async () => {
    if (isDemo) {
      if (user) {
        setIsDemo(false);
      } else {
        setShowLogin(true);
      }
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setIsDemo(true);
      setShowLogin(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      setErrorMsg('Invalid credentials.');
    } else {
      setUser(data.user);
      setIsDemo(false);
      setShowLogin(false);
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="mt-6 border-t border-stone-200 pt-6">
      <div className="flex flex-col space-y-3">
        
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-md font-medium ${isDemo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {isDemo ? '🛠️ Demo Sandbox' : '🟢 Live Database'}
          </span>
          <button 
            onClick={handleToggleClick} 
            className="text-xs text-stone-500 hover:text-stone-800 font-semibold underline"
          >
            {isDemo ? 'Unlock Live Mode' : 'Lock to Demo'}
          </button>
        </div>

        {showLogin && isDemo && (
          <form onSubmit={handleLogin} className="bg-stone-100 p-3 rounded-xl space-y-2 animate-fade-in border border-stone-200">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Admin Authentication</p>
            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
            
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-stone-200 p-2 text-xs rounded-lg focus:outline-none focus:border-amber-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-stone-200 p-2 text-xs rounded-lg focus:outline-none focus:border-amber-500"
              required
            />
            
            <div className="flex gap-2 pt-1">
              <button 
                type="button" 
                onClick={() => setShowLogin(false)} 
                className="flex-1 text-xs py-1.5 text-stone-500 hover:bg-stone-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-stone-800 text-white text-xs py-1.5 rounded-lg font-medium hover:bg-stone-900"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function Header({ isMenuOpen, setIsMenuOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-xs">
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-2 -ml-2 rounded-lg text-stone-600 hover:bg-stone-100 focus:outline-none"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>
      
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Brandeshof Dashboard</h1>
      <div className="w-8"></div>
    </header>
  );
}

interface SidebarMenuProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  setIsMenuOpen: (open: boolean) => void;
}

export function SidebarMenu({ activeTab, setActiveTab, setIsMenuOpen }: SidebarMenuProps) {
  const menuItems = [
    { id: 'daily-log', name: '🐔 Daily Log' },
    { id: 'pantry', name: '📦 Pantry Manager' },
    { id: 'sales', name: '💰 Sales Tracker' },
    { id: 'flock', name: '🐤 Flock Manager' },
    { id: 'reports', name: '📊 Reports & Analytics' }
  ] as const;

  return (
    <div className="fixed inset-0 z-30 flex">
      <div 
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" 
        onClick={() => setIsMenuOpen(false)} 
      />
      <nav className="relative w-72 max-w-xs bg-white h-full shadow-xl flex flex-col p-6 animate-fade-in">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">Farm Navigation</h2>
        <div className="space-y-1">

          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-amber-50 text-amber-800' 
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              {item.name}
            </button>
          ))}
          <LiveDatabaseToggle />
        </div>
      </nav>
    </div>
  );
}