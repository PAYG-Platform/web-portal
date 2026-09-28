import { Role } from '../types';

export enum RoleEnum {
  ADMIN = 'Admin',
  SELLER = 'Seller',
  CLIENT = 'Client',
}

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
  },
  ADMIN: {
    OVERVIEW: '/api/admin/overview',
    SERVERS: '/api/admin/servers',
    SELLERS: '/api/admin/sellers',
    USERS: '/api/admin/users',
    SETTLEMENTS: '/api/admin/settlements',
    SYSTEM_LOGS: '/api/admin/logs',
  },
  SELLER: {
    OVERVIEW: '/api/seller/overview',
    CLIENTS: '/api/seller/clients',
    TOPUPS: '/api/seller/topups',
    DEBT: '/api/seller/debt',
  },
  CLIENT: {
    OVERVIEW: '/api/client/overview',
    WALLET: '/api/client/wallet',
    HISTORY: '/api/client/history',
    REFUND: '/api/client/refund',
  },
};

export const STATUS_COLORS = {
  Active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  Pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  Suspended: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  Rejected: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  Approved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
};
