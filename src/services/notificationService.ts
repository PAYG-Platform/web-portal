// vpn-payg-frontend/src/services/notificationService.ts
import { api } from './api';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: 'ticket' | 'connection' | 'billing' | 'server' | 'system';
  link_url?: string;
  is_seen: boolean;
  seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  unseen_count: number;
}

export const notificationService = {
  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await api.get<{ unseen_count: number }>('/api/notifications/unread-count');
      return res.unseen_count || 0;
    } catch (err: any) {
      return 0;
    }
  },

  getUnseenBillingStatus: async (): Promise<boolean> => {
    try {
      const res = await api.get<{ has_unseen_billing: boolean }>('/api/notifications/unseen-billing');
      return res.has_unseen_billing || false;
    } catch {
      return false;
    }
  },

  markBillingSeen: async (): Promise<void> => {
    try {
      await api.post('/api/notifications/mark-billing-seen');
    } catch {
      // Handled
    }
  },

  getNotifications: async (page = 1, limit = 50): Promise<PaginatedNotifications> => {
    return await api.get<PaginatedNotifications>(`/api/notifications?page=${page}&limit=${limit}`);
  },

  markSeen: async (notificationIds: string[]): Promise<void> => {
    if (!notificationIds || notificationIds.length === 0) return;
    await api.post('/api/notifications/mark-seen', { notification_ids: notificationIds });
  },

  markAllSeen: async (): Promise<void> => {
    try {
      await api.post('/api/notifications/mark-all-seen');
    } catch {
      // Handled
    }
  }
};