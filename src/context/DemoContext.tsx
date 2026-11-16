import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface DemoContextType {
  /** True whenever there is no authenticated session. Derived from auth — cannot be toggled manually. */
  isDemo: boolean;
  /** False until the initial session check has finished. */
  authReady: boolean;
  user: User | null;
  demoMessage: string | null;
  triggerDemoToast: (msg?: string) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isDemo = !user;

  const triggerDemoToast = (msg = "Demo Mode: Transaction simulated locally.") => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 3500);
  };

  return (
    <DemoContext.Provider value={{ isDemo, authReady, user, demoMessage, triggerDemoToast }}>
      {children}
      {demoMessage && (
        <div
          className={`fixed bottom-4 right-4 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg animate-bounce z-50
          ${isDemo ? 'bg-amber-600' : 'bg-emerald-600'} `}
        >
          {demoMessage}
        </div>
      )}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
