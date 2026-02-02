/**
 * ScrollToTopContext
 *
 * Lets drawer (and other callers) trigger scroll-to-top on specific screens
 * when the user taps the same nav item again (e.g. Dashboard while already on Dashboard).
 */

import React, { createContext, useContext, useRef } from 'react';

const ScrollToTopContext = createContext(null);

export function ScrollToTopProvider({ children }) {
  // Refs for scroll-to-top callbacks: key = route path, value = () => void
  const callbacksRef = useRef({});

  const register = (key, fn) => {
    callbacksRef.current[key] = fn;
    return () => {
      delete callbacksRef.current[key];
    };
  };

  const scrollToTop = (key) => {
    const fn = callbacksRef.current[key];
    if (typeof fn === 'function') fn();
  };

  const value = { register, scrollToTop };
  return (
    <ScrollToTopContext.Provider value={value}>
      {children}
    </ScrollToTopContext.Provider>
  );
}

export function useScrollToTop() {
  const ctx = useContext(ScrollToTopContext);
  if (!ctx) return { register: () => () => {}, scrollToTop: () => {} };
  return ctx;
}
