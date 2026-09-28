// src/contexts/SSEContext.tsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getBaseUrl } from '../services/api';

interface SSEContextType {
  lastTicketUpdate: number;
  lastNotificationUpdate: number;
  lastTopupUpdate: number;
  triggerTicketUpdate: () => void;
  triggerNotificationUpdate: () => void;
  triggerTopupUpdate: () => void;
}

const SSEContext = createContext<SSEContextType>({
  lastTicketUpdate: 0,
  lastNotificationUpdate: 0,
  lastTopupUpdate: 0,
  triggerTicketUpdate: () => {},
  triggerNotificationUpdate: () => {},
  triggerTopupUpdate: () => {},
});

export const useSSEContext = () => useContext(SSEContext);

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [lastTicketUpdate, setLastTicketUpdate] = useState<number>(0);
  const [lastNotificationUpdate, setLastNotificationUpdate] = useState<number>(0);
  const [lastTopupUpdate, setLastTopupUpdate] = useState<number>(0);

  const triggerTicketUpdate = useCallback(() => {
    setLastTicketUpdate(Date.now());
  }, []);

  const triggerNotificationUpdate = useCallback(() => {
    setLastNotificationUpdate(Date.now());
  }, []);

  const triggerTopupUpdate = useCallback(() => {
    setLastTopupUpdate(Date.now());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const baseUrl = getBaseUrl();
    const url = `${baseUrl ? baseUrl : ''}/api/notifications/stream`;

    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('ticket_update', () => {
      setLastTicketUpdate(Date.now());
      setLastNotificationUpdate(Date.now()); // Trigger generic notification bell pulse
    });

    es.addEventListener('notification', () => {
      setLastNotificationUpdate(Date.now());
    });

    es.addEventListener('pending_topup', () => {
      setLastTopupUpdate(Date.now());
      setLastNotificationUpdate(Date.now()); // Trigger generic notification bell pulse
    });

    es.onerror = () => {
      // Browser EventSource automatically attempts to reconnect on error.
      // We don't need to do anything here except ignore the warning.
    };

    return () => {
      es.close();
    };
  }, [isAuthenticated]);

  return (
    <SSEContext.Provider 
      value={{ 
        lastTicketUpdate, 
        lastNotificationUpdate, 
        lastTopupUpdate,
        triggerTicketUpdate, 
        triggerNotificationUpdate,
        triggerTopupUpdate
      }}
    >
      {children}
    </SSEContext.Provider>
  );
};