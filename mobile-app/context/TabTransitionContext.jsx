/**
 * TabTransitionContext
 *
 * Tracks tab order so the four main tab screens (Dashboard, Transactions, Analytics, Profile)
 * can run directional slide animations when switching tabs (microscope-slide style).
 * Tab indices: Dashboard=0, Transactions=1, Analytics=2, Profile=3.
 */

import { createContext, useContext, useState, useCallback } from 'react';

const TabTransitionContext = createContext(null);

export function TabTransitionProvider({ children }) {
  const [state, setState] = useState({ previousTabIndex: null, currentTabIndex: 0 });

  const registerTabIndex = useCallback((index) => {
    setState((prev) => ({
      previousTabIndex: prev.currentTabIndex,
      currentTabIndex: index,
    }));
  }, []);

  const value = {
    previousTabIndex: state.previousTabIndex,
    currentTabIndex: state.currentTabIndex,
    registerTabIndex,
  };

  return (
    <TabTransitionContext.Provider value={value}>
      {children}
    </TabTransitionContext.Provider>
  );
}

export function useTabTransition() {
  const ctx = useContext(TabTransitionContext);
  if (!ctx) {
    throw new Error('useTabTransition must be used within TabTransitionProvider');
  }
  return ctx;
}
