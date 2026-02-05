/**
 * Partner Sync Service using SignalR
 * Handles real-time notifications when partner adds transactions
 */

import * as signalR from '@microsoft/signalr';
import { getToken } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const HUB_URL = `${API_URL}/hubs/partner`;

let connection = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

/**
 * Event listeners for partner activity
 */
const listeners = {
  onPartnerTransactionAdded: [],
  onConnectionStateChanged: [],
};

/**
 * Add a listener for partner transaction events
 * @param {Function} callback - Called with transaction data when partner adds a transaction
 * @returns {Function} - Unsubscribe function
 */
export const onPartnerTransactionAdded = (callback) => {
  listeners.onPartnerTransactionAdded.push(callback);
  return () => {
    listeners.onPartnerTransactionAdded = listeners.onPartnerTransactionAdded.filter(
      (cb) => cb !== callback
    );
  };
};

/**
 * Add a listener for connection state changes
 * @param {Function} callback - Called with 'connected', 'disconnected', or 'reconnecting'
 * @returns {Function} - Unsubscribe function
 */
export const onConnectionStateChanged = (callback) => {
  listeners.onConnectionStateChanged.push(callback);
  return () => {
    listeners.onConnectionStateChanged = listeners.onConnectionStateChanged.filter(
      (cb) => cb !== callback
    );
  };
};

/**
 * Notify all listeners of a connection state change
 */
const notifyConnectionState = (state) => {
  listeners.onConnectionStateChanged.forEach((cb) => {
    try {
      cb(state);
    } catch (e) {
      console.warn('Error in connection state listener:', e);
    }
  });
};

/**
 * Start the SignalR connection
 * @returns {Promise<void>}
 */
export const startConnection = async () => {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    console.log('[PartnerSync] Already connected');
    return;
  }

  const token = getToken();
  if (!token) {
    console.log('[PartnerSync] No auth token, skipping connection');
    return;
  }

  try {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) {
            return null; // Stop reconnecting
          }
          return RECONNECT_DELAY_MS * Math.pow(2, retryContext.previousRetryCount);
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Set up event handlers
    connection.on('PartnerTransactionAdded', (data) => {
      console.log('[PartnerSync] Partner transaction received:', data);
      listeners.onPartnerTransactionAdded.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.warn('Error in partner transaction listener:', e);
        }
      });
    });

    connection.onreconnecting(() => {
      console.log('[PartnerSync] Reconnecting...');
      notifyConnectionState('reconnecting');
    });

    connection.onreconnected(() => {
      console.log('[PartnerSync] Reconnected');
      reconnectAttempts = 0;
      notifyConnectionState('connected');
    });

    connection.onclose((error) => {
      console.log('[PartnerSync] Connection closed', error);
      notifyConnectionState('disconnected');

      // Attempt manual reconnection if auto-reconnect failed
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`[PartnerSync] Manual reconnect attempt ${reconnectAttempts}`);
          startConnection().catch(console.error);
        }, RECONNECT_DELAY_MS * reconnectAttempts);
      }
    });

    await connection.start();
    console.log('[PartnerSync] Connected to partner hub');
    reconnectAttempts = 0;
    notifyConnectionState('connected');
  } catch (error) {
    console.error('[PartnerSync] Connection error:', error);
    notifyConnectionState('disconnected');
    throw error;
  }
};

/**
 * Stop the SignalR connection
 * @returns {Promise<void>}
 */
export const stopConnection = async () => {
  if (connection) {
    try {
      await connection.stop();
      console.log('[PartnerSync] Disconnected');
    } catch (error) {
      console.error('[PartnerSync] Error stopping connection:', error);
    }
    connection = null;
    notifyConnectionState('disconnected');
  }
};

/**
 * Check if currently connected
 * @returns {boolean}
 */
export const isConnected = () => {
  return connection?.state === signalR.HubConnectionState.Connected;
};

/**
 * Get the current connection state
 * @returns {string|null}
 */
export const getConnectionState = () => {
  if (!connection) return null;
  switch (connection.state) {
    case signalR.HubConnectionState.Connected:
      return 'connected';
    case signalR.HubConnectionState.Connecting:
    case signalR.HubConnectionState.Reconnecting:
      return 'reconnecting';
    default:
      return 'disconnected';
  }
};
