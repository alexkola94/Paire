/**
 * BackGestureContext
 *
 * Tracks whether the current screen can go back so the app layout can:
 * - Disable the drawer's left-edge swipe when back is available (so swipe = back, not drawer)
 * - Show the back-gesture overlay that triggers router.back() on left-edge pan
 *
 * Non-tab (app) screens call useBackGesture() to report canGoBack; tab roots do not.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';

const BackGestureContext = createContext(null);

export function BackGestureProvider({ children }) {
  const [canGoBack, setCanGoBack] = useState(false);

  const value = {
    canGoBack,
    setCanGoBack,
  };

  return (
    <BackGestureContext.Provider value={value}>
      {children}
    </BackGestureContext.Provider>
  );
}

export function useBackGestureContext() {
  const ctx = useContext(BackGestureContext);
  if (!ctx) {
    throw new Error('useBackGestureContext must be used within BackGestureProvider');
  }
  return ctx;
}

/**
 * Call this on (app) screens that have a back button / can go back.
 * On focus: sets canGoBack(router.canGoBack()); on blur: sets canGoBack(false).
 * Tab roots (dashboard, transactions, bills, profile) should NOT use this.
 */
export function useBackGesture() {
  const router = useRouter();
  const { setCanGoBack } = useBackGestureContext();

  useFocusEffect(
    useCallback(() => {
      setCanGoBack(router.canGoBack());
      return () => setCanGoBack(false);
    }, [router, setCanGoBack])
  );
}
