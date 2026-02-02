/**
 * OverlayContext – Global state for modal/portal/form visibility.
 * Used to hide the calculator FAB when any overlay is open.
 * Counter supports nested overlays (e.g. modal inside sheet).
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const OverlayContext = createContext(null);

const noop = () => {};

/** Default value when used outside OverlayProvider (e.g. tests) – no-ops, overlayCount 0 */
const defaultOverlay = {
  overlayCount: 0,
  openOverlay: noop,
  closeOverlay: noop,
};

export function OverlayProvider({ children }) {
  const [overlayCount, setOverlayCount] = useState(0);

  const openOverlay = useCallback(() => {
    setOverlayCount((c) => c + 1);
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo(
    () => ({ overlayCount, openOverlay, closeOverlay }),
    [overlayCount, openOverlay, closeOverlay]
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
    </OverlayContext.Provider>
  );
}

/**
 * @returns {{ overlayCount: number, openOverlay: () => void, closeOverlay: () => void }}
 */
export function useOverlay() {
  const context = useContext(OverlayContext);
  return context ?? defaultOverlay;
}

export default OverlayContext;
