import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationItem, PaginatedNotifications } from '../services/notificationService';
import { useSSEContext } from '../contexts/SSEContext';

export function useNotificationPoller(isAuthenticated: boolean) {
  const [unseenCount, setUnseenCount] = useState<number>(0);
  const [paginatedData, setPaginatedData] = useState<PaginatedNotifications>({
    items: [],
    total: 0,
    page: 1,
    limit: 50,
    total_pages: 1,
    unseen_count: 0
  });
  const [loading, setLoading] = useState<boolean>(false);
  const { lastNotificationUpdate } = useSSEContext();

  const fetchUnreadCountOnly = useCallback(async () => {
    if (!isAuthenticated) return;
    const count = await notificationService.getUnreadCount();
    setUnseenCount(count);
  }, [isAuthenticated]);

  const fetchPage = useCallback(async (page = 1, append = false) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(page, 50);
      setPaginatedData(prev => {
        if (append) {
          const existingIds = new Set(prev.items.map(i => i.id));
          const newUnique = data.items.filter(i => !existingIds.has(i.id));
          return { ...data, items: [...prev.items, ...newUnique] };
        }
        return data;
      });
      setUnseenCount(data.unseen_count);
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Execute on mount, and automatically trigger again whenever SSE pushes a notification event
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCountOnly();
  }, [isAuthenticated, lastNotificationUpdate, fetchUnreadCountOnly]);

  return {
    unseenCount,
    setUnseenCount,
    paginatedData,
    loading,
    fetchPage,
    fetchUnreadCountOnly
  };
}