import { apiRequest } from './api';

export const adminService = {
  getOverviewData: () => apiRequest('/api/admin/overview').catch(() => null),
  getServers: () => apiRequest('/api/admin/servers').catch(() => []),
  getSellers: () => apiRequest('/api/admin/sellers').catch(() => []),
  getUsers: () => apiRequest('/api/admin/users').catch(() => []),
  getSettlements: () => apiRequest('/api/admin/settlements').catch(() => []),
  getSystemLogs: () => apiRequest('/api/admin/logs').catch(() => []),
};
