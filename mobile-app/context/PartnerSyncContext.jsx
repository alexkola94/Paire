/**
 * Partner Sync Context
 * Provides real-time partner activity notifications via SignalR
 * Shows toast when partner adds transactions
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import {
  startConnection,
  stopConnection,
  onPartnerTransactionAdded,
  onConnectionStateChanged,
  isConnected,
  getConnectionState,
} from '../services/partnerSync';
import { getToken } from '../services/auth';
import { useToast } from '../components/Toast';

const PartnerSyncContext = createContext({
  isConnected: false,
  connectionState: null,
});

export function PartnerSyncProvider({ children }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState(null);
  const appState = useRef(AppState.currentState);

  // Handle partner transaction notifications
  const handlePartnerTransaction = useCallback(
    (data) => {
      const { type, amount, category, description, partnerName } = data;

      // Format amount with currency
      const formattedAmount = `€${Number(amount).toFixed(2)}`;
      const itemName = description || category || t('common.transaction');

      // Show toast notification
      const message = type === 'expense'
        ? t('partnerSync.partnerAddedExpense', {
            name: partnerName,
            item: itemName,
            amount: formattedAmount,
            defaultValue: `${partnerName} added: ${itemName} - ${formattedAmount}`,
          })
        : t('partnerSync.partnerAddedIncome', {
            name: partnerName,
            item: itemName,
            amount: formattedAmount,
            defaultValue: `${partnerName} added income: ${itemName} - ${formattedAmount}`,
          });

      showToast(message, 'info');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    [t, showToast, queryClient]
  );

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state) => {
    setConnectionState(state);
    setConnected(state === 'connected');
  }, []);

  // Connect/disconnect based on auth state and app state
  const connect = useCallback(async () => {
    const token = getToken();
    if (!token) {
      console.log('[PartnerSyncContext] No token, skipping connection');
      return;
    }

    try {
      await startConnection();
    } catch (error) {
      console.error('[PartnerSyncContext] Failed to connect:', error);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await stopConnection();
  }, []);

  // Handle app state changes (connect when active, disconnect when background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('[PartnerSyncContext] App became active, reconnecting');
        connect();
      } else if (nextAppState.match(/inactive|background/)) {
        // App is going to background
        console.log('[PartnerSyncContext] App going to background, disconnecting');
        disconnect();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [connect, disconnect]);

  // Set up event listeners
  useEffect(() => {
    const unsubTransaction = onPartnerTransactionAdded(handlePartnerTransaction);
    const unsubState = onConnectionStateChanged(handleConnectionStateChange);

    // Initial connection
    connect();

    return () => {
      unsubTransaction();
      unsubState();
      disconnect();
    };
  }, [handlePartnerTransaction, handleConnectionStateChange, connect, disconnect]);

  return (
    <PartnerSyncContext.Provider
      value={{
        isConnected: connected,
        connectionState,
        reconnect: connect,
      }}
    >
      {children}
    </PartnerSyncContext.Provider>
  );
}

export const usePartnerSync = () => useContext(PartnerSyncContext);
