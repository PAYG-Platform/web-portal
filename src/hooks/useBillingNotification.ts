import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import { useSSEContext } from '../contexts/SSEContext';

export function useBillingNotification(isAuthenticated: boolean, role: string) {
  const [hasUnseenBilling, setHasUnseenBilling] = useState(false);
  const { lastNotificationUpdate } = useSSEContext();

  const checkUnseenBilling = useCallback(async () => {
    if (!isAuthenticated || role !== 'Client') return;
    try {
      const hasUnseen = await notificationService.getUnseenBillingStatus();
      setHasUnseenBilling(hasUnseen);
    } catch {
      setHasUnseenBilling(false);
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    checkUnseenBilling();
  }, [checkUnseenBilling, lastNotificationUpdate]);

  const clearUnseenBilling = () => {
    setHasUnseenBilling(false);
  };

  return { hasUnseenBilling, clearUnseenBilling, checkUnseenBilling };
}