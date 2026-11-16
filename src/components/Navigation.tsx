import type { Tab } from '../types/types';
import { useState } from 'react';
import { useDemo } from '../context/DemoContext';
import { supabase } from '../supabaseClient';
import { demoStore } from '../demo/demoStore';
import Sheet from './Sheet';
import { TAB_TITLES, BOTTOM_TABS, MENU_TABS } from './navigationConfig';

// ---------- Header ----------

interface HeaderProps {
  title: string;
  onOpenMenu: () => void;
}

export function Header({ title, onOpenMenu }: HeaderProps) {
  const { isDemo } = useDemo();

  return (
    <header className="sticky top-0 z-[5] flex items-end justify-between gap-3 border-b border-line bg-app px-5 pt-[18px] pb-3">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.08em] text-muted">
          Brandeshof Coop
          {isDemo && (
            <span className="rounded bg-gift-bg px-1.5 py-px text-[10px] text-gift">Demo</span>
          )}
        </span>
        <h1 className="m-0 text-2xl font-semibold tracking-[-.02em]">{title}</h1>
      </div>

      <button
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-edge bg-surface text-muted hover:bg-subtle hover:text-ink"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>
    </header>
  );
}

// ---------- Bottom tab bar ----------

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex h-[52px] cursor-pointer flex-col items-center justify-center gap-[5px] bg-transparent ${active ? 'text-ink' : 'text-muted'}`}
    >
      <span className={`h-[3px] w-[18px] rounded-sm ${active ? 'bg-ink' : 'bg-transparent'}`} />
      <span className={`text-xs ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
    </button>
  );
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-10 grid w-full max-w-[440px] -translate-x-1/2 grid-cols-4 items-center border-t border-line bg-surface px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]">
      {BOTTOM_TABS.map(id => (
        <NavTab key={id} label={TAB_TITLES[id]} active={activeTab === id} onClick={() => setActiveTab(id)} />
      ))}
    </nav>
  );
}

// ---------- "More" menu (header) ----------

interface MoreMenuProps {
  open: boolean;
  onClose: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

function AccountSection() {
  // Mode is derived from the Supabase session in DemoContext; signing in/out updates it automatically.
  const { isDemo, user } = useDemo();
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg('Invalid credentials.');
    } else {
      setShowLogin(false);
      setEmail('');
      setPassword('');
    }
  };

  const handleResetDemo = () => {
    if (!window.confirm('Reset the demo sandbox back to its sample data?')) return;
    demoStore.reset();
    // Reload so every page re-reads the fresh sample data.
    window.location.reload();
  };

  const inputClass =
    'h-11 w-full rounded-lg border border-edge bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink';

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs text-muted">Data</span>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">{isDemo ? 'Demo sandbox' : 'Live database'}</span>
            <span className="truncate text-xs text-muted">
              {isDemo ? 'Sample data only — nothing is saved to the farm records.' : `Signed in as ${user?.email ?? 'admin'}`}
            </span>
          </div>
          {!showLogin && (
            <button
              onClick={() => (isDemo ? setShowLogin(true) : supabase.auth.signOut())}
              className="shrink-0 cursor-pointer text-[13px] font-medium underline underline-offset-[3px]"
            >
              {isDemo ? 'Sign in' : 'Sign out'}
            </button>
          )}
        </div>

        {showLogin && isDemo && (
          <form onSubmit={handleLogin} className="flex flex-col gap-2">
            {errorMsg && <p className="m-0 text-xs text-expense">{errorMsg}</p>}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowLogin(false)} className="h-11 flex-1 cursor-pointer rounded-lg text-sm text-muted hover:bg-subtle">
                Cancel
              </button>
              <button type="submit" className="h-11 flex-1 cursor-pointer rounded-lg bg-ink text-sm font-medium text-app active:bg-ink-pressed">
                Sign in
              </button>
            </div>
          </form>
        )}

        {isDemo && !showLogin && (
          <button onClick={handleResetDemo} className="cursor-pointer self-start text-xs text-muted underline underline-offset-[3px] hover:text-ink">
            Reset demo data
          </button>
        )}
      </div>
    </div>
  );
}

export function MoreMenu({ open, onClose, activeTab, setActiveTab }: MoreMenuProps) {
  return (
    <Sheet open={open} title="More" onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        <span className="text-xs text-muted">Pages</span>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {MENU_TABS.map((id, i) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                onClose();
              }}
              className={`flex h-12 w-full cursor-pointer items-center justify-between px-3.5 text-left text-sm hover:bg-app ${i ? 'border-t border-divider' : ''} ${activeTab === id ? 'font-semibold' : ''}`}
            >
              {TAB_TITLES[id]}
              <span className="text-muted">›</span>
            </button>
          ))}
        </div>
      </div>

      <AccountSection />
    </Sheet>
  );
}
