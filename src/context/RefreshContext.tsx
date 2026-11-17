import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * All screens stay mounted (see App.tsx), so they don't reload by being shown again.
 * Instead they reload quietly — keeping their current content on screen — whenever `refreshKey` changes:
 * after a save anywhere in the app, or when the app comes back after a while in the background
 * (to pick up changes made on another device).
 */
interface RefreshContextType {
  /** Add to a screen's data-loading effect dependencies. */
  refreshKey: number;
  /** Call after saving or deleting anything, so every screen picks up the change. */
  notifyDataChanged: () => void;
}

/** Background time after which returning to the app reloads all screens. */
const STALE_AFTER_MS = 30_000;

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const notifyDataChanged = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt >= STALE_AFTER_MS) {
        hiddenAt = null;
        notifyDataChanged();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [notifyDataChanged]);

  return <RefreshContext.Provider value={{ refreshKey, notifyDataChanged }}>{children}</RefreshContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) throw new Error('useRefresh must be used within a RefreshProvider');
  return context;
}
