// src/services/clientService.ts
import { api, apiRequest } from './api';

export interface SellerDirectoryItem {
  id: string;
  username: string;
  email: string;
  name?: string;
  created_at: string;
}

export   interface PaginatedSellersResponse {
  items: SellerDirectoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ConnectedSellerItem {
  id: string;
  client_id: string;
  seller_id: string;
  status: 'Active' | 'Pending' | 'Rejected' | 'Removed';
  request_note?: string;
  is_auto_connected: boolean;
  created_at: string;
  seller_username?: string;
}

export const clientService = {
  getOverviewData: () => apiRequest('/api/client/overview').catch(() => null),
  getPaymentHistory: () => apiRequest('/api/client/history').catch(() => []),
  getRefundRequests: () => apiRequest('/api/client/refund').catch(() => []),
  getServers: () => apiRequest('/api/client/servers').catch(() => []),

  // Search active resellers by username ONLY
  searchSellers: async (usernameQuery?: string, page = 1, limit = 10): Promise<PaginatedSellersResponse> => {
    const params = new URLSearchParams();
    if (usernameQuery && usernameQuery.trim()) {
      params.append('username', usernameQuery.trim());
    }
    params.append('page', String(page));
    params.append('limit', String(limit));

    const res = await api.get<any>(`/api/iam/connections/sellers/directory?${params.toString()}`);
    
    // Support both paginated object response or legacy array fallback
    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length, total_pages: 1 };
    }
    return res;
  },

  // Initiate connection request
  requestSellerConnection: async (sellerId: string, note?: string) => {
    return await api.post('/api/iam/connections/sellers/connect', {
      seller_id: sellerId,
      note: note || undefined
    });
  },

  // Process connection request directly from ticket thread
  processTicketConnection: async (ticketId: string, action: 'Approve' | 'Reject') => {
    return await api.post(`/api/support/tickets/${ticketId}/process-connection`, { action });
  },

  getMyConnectedSellers: async (): Promise<ConnectedSellerItem[]> => {
    return await api.get<ConnectedSellerItem[]>('/api/iam/connections/my-sellers').catch(() => []);
  },

  getSellerChangeStatus: async () => {
    return await api.get<{
      can_connect: boolean;
      connect_cooldown_days: number;
      connect_remaining_days: number;
      can_disconnect: boolean;
      disconnect_cooldown_days: number;
      disconnect_remaining_days: number;
    }>('/api/iam/connections/seller-change-status');
  },

  removeConnectedSeller: async (sellerId: string) => {
    return await api.delete(`/api/iam/connections/my-sellers/${sellerId}`);
  },

    cancelPendingConnectionRequest: async (sellerId: string) => {
    // 1. Remove connection in IAM Service
    await api.delete(`/api/iam/connections/my-sellers/${sellerId}`).catch(() => {});
    // 2. Delete pending connection request ticket in Support Service
    await api.delete(`/api/support/tickets/connection-request?seller_id=${sellerId}`).catch(() => {});
  },
};