/**
 * LogoutContext – Global state for logout-in-progress.
 * When startLogout() is called, isLoggingOut becomes true and LogoutLoadingOverlay is shown.
 * No explicit "stop" is needed: (app) layout unmounts on navigate to login, so overlay goes away.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LogoutContext = createContext(null);

/** Default when used outside LogoutProvider (e.g. tests) */
const defaultLogout = {
  isLoggingOut: false,
  startLogout: () => {},
};

export function LogoutProvider({ children }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const startLogout = useCallback(() => {
    setIsLoggingOut(true);
  }, []);

  const value = useMemo(
    () => ({ isLoggingOut, startLogout }),
    [isLoggingOut, startLogout]
  );

  return (
    <LogoutContext.Provider value={value}>
      {children}
    </LogoutContext.Provider>
  );
}

/**
 * @returns {{ isLoggingOut: boolean, startLogout: () => void }}
 */
export function useLogout() {
  const context = useContext(LogoutContext);
  return context ?? defaultLogout;
}

export default LogoutContext;
