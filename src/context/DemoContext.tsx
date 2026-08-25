import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface DemoContextType {
  isDemo: boolean;
  setIsDemo: (val: boolean) => void;
  demoMessage: string | null;
  triggerDemoToast: (msg?: string) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setIsDemo(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsDemo(!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const triggerDemoToast = (msg = "Demo Mode: Transaction simulated locally.") => {
    setDemoMessage(msg);
    setTimeout(() => setDemoMessage(null), 3500);
  };

  return (
    <DemoContext.Provider value={{ isDemo, setIsDemo, demoMessage, triggerDemoToast }}>
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