import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users as UsersIcon, Plus, Search, ChevronLeft, ChevronRight, 
  Gift, X, Check, RefreshCw, 
  CheckCircle2, XCircle, PlusCircle, MinusCircle, AlertTriangle, AlertCircle,
  ShieldCheck, Lock, UserCheck, UserX, Eye, EyeOff, User, TrendingUp, Activity,
  PieChart as PieIcon, Radio, Wallet, ArrowDownLeft, ArrowUpRight, Server, Copy,
  QrCode, ExternalLink, RotateCcw, Bot
} from 'lucide-react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../components/ui/StatCard';
import { api } from '../services/api';
import { authService } from '../services/authService';
import { isCommonWeakPassword } from '../utils/passwords';
import { QRCodeView } from '../components/common/QRCodeView';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: string;
  name?: string;
  billing_currency?: string;
  is_active: boolean;
  created_at: string;
  paid_balance: number;
  gift_balance: number;
  total_balance: number;
  frozen_amount: number;
  used_credit: number;
  min_topup_amount?: number;
}

interface UserTrendItem {
  day: string;
  date_iso: string;
  data_mb: number;
  data_bytes: number;
  topup_toman: number;
  gift_toman: number;
}

interface ProviderStatItem {
  name: string;
  country: string;
  bytes: number;
  percentage: number;
  color: string;
  ip_address?: string;
  last_ip?: string;
}

const DEFAULT_CHART_COLORS = ['#00b4d8', '#2563eb', '#f59e0b', '#84cc16', '#64748b', '#8b5cf6', '#0369a1', '#a855f7', '#6366f1'];

export function Users() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Modals & Drawer State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [selectedUserForGift, setSelectedUserForGift] = useState<UserRecord | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserRecord | null>(null);

  // 30-Day Telemetry Chart Data for Inspected User
  const [userTrendData, setUserTrendData] = useState<UserTrendItem[]>([]);
  const [loadingUserTrends, setLoadingUserTrends] = useState(false);

  // ISP Provider Stats for Inspected User
  const [userProviderStats, setUserProviderStats] = useState<ProviderStatItem[]>([]);
  const [loadingUserProviders, setLoadingUserProviders] = useState(false);

  // Add User Form State
  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addBillingCurrency, setAddBillingCurrency] = useState<'IRT' | 'USD'>('IRT');
  const [initialGift, setInitialGift] = useState<string>('0');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Debounced Availability State
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'valid' | 'invalid' | null>(null);
  const [usernameMsg, setUsernameMsg] = useState('');

  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'valid' | 'invalid' | null>(null);
  const [emailMsg, setEmailMsg] = useState('');

  // Debounced Username Uniqueness Check
  useEffect(() => {
    if (!isAddUserModalOpen) return;
    const clean = addUsername.trim();
    if (!clean) {
      setUsernameLoading(false);
      setUsernameStatus(null);
      setUsernameMsg('');
      return;
    }

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]?$/;
    if (clean.length < 3) {
      setUsernameLoading(false);
      setUsernameStatus('invalid');
      setUsernameMsg('Username must be at least 3 characters');
      return;
    }
    if (!usernameRegex.test(clean)) {
      setUsernameLoading(false);
      setUsernameStatus('invalid');
      setUsernameMsg('Must start with a letter and contain letters/numbers/underscores');
      return;
    }

    setUsernameStatus(null);
    setUsernameMsg('');

    const loadingTimer = setTimeout(() => setUsernameLoading(true), 200);
    const apiTimer = setTimeout(async () => {
      try {
        const isAvailable = await authService.checkUsernameAvailability(clean);
        setUsernameLoading(false);
        if (isAvailable) {
          setUsernameStatus('valid');
          setUsernameMsg('Username is available');
        } else {
          setUsernameStatus('invalid');
          setUsernameMsg('Username is already taken');
        }
      } catch {
        setUsernameLoading(false);
        setUsernameStatus('invalid');
        setUsernameMsg('Could not verify username availability');
      }
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(apiTimer);
    };
  }, [addUsername, isAddUserModalOpen]);

  // Debounced Email Uniqueness Check
  useEffect(() => {
    if (!isAddUserModalOpen) return;
    const clean = addEmail.trim();
    if (!clean) {
      setEmailLoading(false);
      setEmailStatus(null);
      setEmailMsg('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setEmailLoading(false);
      setEmailStatus('invalid');
      setEmailMsg('Invalid email format');
      return;
    }

    setEmailStatus(null);
    setEmailMsg('');

    const loadingTimer = setTimeout(() => setEmailLoading(true), 200);
    const apiTimer = setTimeout(async () => {
      try {
        const isAvailable = await authService.checkEmailAvailability(clean);
        setEmailLoading(false);
        if (isAvailable) {
          setEmailStatus('valid');
          setEmailMsg('Email is available');
        } else {
          setEmailStatus('invalid');
          setEmailMsg('Email is already registered');
        }
      } catch {
        setEmailLoading(false);
        setEmailStatus('invalid');
        setEmailMsg('Could not verify email availability');
      }
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(apiTimer);
    };
  }, [addEmail, isAddUserModalOpen]);

  // Password Complexity Evaluation
  const getPasswordRequirements = (pwd: string) => ({
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\\/]/.test(pwd),
    notCommon: !isCommonWeakPassword(pwd),
  });

  const addPasswordReqs = getPasswordRequirements(addPassword);
  const addPasswordScore = Object.values(addPasswordReqs).filter(Boolean).length;
  const isAddPasswordStrong = addPasswordScore === 6;

  // Gift Adjuster Form State
  const [giftAction, setGiftAction] = useState<'Credit' | 'Debit'>('Credit');
  const [giftAmount, setGiftAmount] = useState<string>('20000');
  const [giftReason, setGiftReason] = useState<string>('');
  const [isAdjustingGift, setIsAdjustingGift] = useState(false);

  // Admin Direct Top-Up & Refund Modals State
  const [isDirectTopupOpen, setIsDirectTopupOpen] = useState(false);
  const [directTopupAmount, setDirectTopupAmount] = useState<string>('50000');
  const [directTopupDesc, setDirectTopupDesc] = useState<string>('');
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);

  const [isDirectRefundOpen, setIsDirectRefundOpen] = useState(false);
  const [directRefundAmount, setDirectRefundAmount] = useState<string>('');
  const [directRefundAccount, setDirectRefundAccount] = useState<string>('');
  const [directRefundReason, setDirectRefundReason] = useState<string>('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // User Server Routes & History State
  const [routesTab, setRoutesTab] = useState<'current' | 'history'>('current');
  const [userActiveRoutes, setUserActiveRoutes] = useState<any[]>([]);
  const [userBlockedRoutes, setUserBlockedRoutes] = useState<any[]>([]);
  const [availableServersForReassign, setAvailableServersForReassign] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Manual Reassignment Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [routeToReassign, setRouteToReassign] = useState<any | null>(null);
  const [selectedNewServerId, setSelectedNewServerId] = useState<string>('');
  const [selectedNewInboundId, setSelectedNewInboundId] = useState<number>(1);
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  // Admin Add User Config Modal State
  const [isAddConfigModalOpen, setIsAddConfigModalOpen] = useState(false);
  const [addConfigLocationId, setAddConfigLocationId] = useState<string>('');
  const [addConfigServerId, setAddConfigServerId] = useState<string>('');
  const [addConfigInboundId, setAddConfigInboundId] = useState<number>(1);
  const [isSubmittingAddConfig, setIsSubmittingAddConfig] = useState(false);

  // Admin Delete User Config State
  const [deletingConfigId, setDeletingConfigId] = useState<string | null>(null);
  const [togglingConfigId, setTogglingConfigId] = useState<string | null>(null);

  // QR Modal State for User URIs
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [copiedUriId, setCopiedUriId] = useState<string | null>(null);

  // Group User ISP Traffic by Provider
  const groupedUserProviders = useMemo(() => {
    if (!userProviderStats || userProviderStats.length === 0) return [];

    const totalBytes = userProviderStats.reduce((acc, p) => acc + (p.bytes || 0), 0);
    if (totalBytes === 0) return [];

    const providerMap = new Map<string, {
      name: string;
      country: string;
      bytes: number;
      color: string;
      ips: Set<string>;
    }>();

    for (const item of userProviderStats) {
      const ispName = item.name || 'Other / Direct';
      if (!providerMap.has(ispName)) {
        providerMap.set(ispName, {
          name: ispName,
          country: item.country || 'Unknown',
          bytes: 0,
          color: item.color || '#64748b',
          ips: new Set<string>()
        });
      }
      const entry = providerMap.get(ispName)!;
      entry.bytes += (item.bytes || 0);
      if (item.ip_address && item.ip_address !== 'Unknown' && item.ip_address !== 'Direct / Unknown') {
        entry.ips.add(item.ip_address);
      }
    }

    const aggregated = Array.from(providerMap.values()).map(g => ({
      name: g.name,
      country: g.country,
      bytes: g.bytes,
      percentage: Number(((g.bytes / totalBytes) * 100).toFixed(1)),
      color: g.color,
      ips: Array.from(g.ips)
    }));

    return aggregated.sort((a, b) => b.bytes - a.bytes);
  }, [userProviderStats]);

  // Suspend / Activate Confirmation State
  const [userToToggleStatus, setUserToToggleStatus] = useState<UserRecord | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // User Telegram Token & Link State in Drawer
  const [userTelegramInfo, setUserTelegramInfo] = useState<{
    telegram_link: string;
    token: string;
    is_connected: boolean;
    telegram_id?: string;
  } | null>(null);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [revokingTelegram, setRevokingTelegram] = useState(false);
  const [copiedTgToken, setCopiedTgToken] = useState(false);
  const [copiedTgLink, setCopiedTgLink] = useState(false);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, balancesRes] = await Promise.all([
        api.get<any>(`/api/iam/users/admin/list-paginated?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}&status=${statusFilter}`),
        api.get<Record<string, { paid_balance: number; gift_balance: number; total_balance: number; frozen_amount: number; used_credit: number }>>('/api/billing/topups/admin/users-balances').catch(() => ({}))
      ]);

      const items: UserRecord[] = (usersRes?.items || []).map((u: any) => {
        const uid = String(u.id);
        const bal = balancesRes[uid] || { paid_balance: 0, gift_balance: 0, total_balance: 0, frozen_amount: 0, used_credit: 0 };

        return {
          id: uid,
          username: u.username,
          email: u.email,
          role: u.role,
          name: u.name,
          billing_currency: (u.billing_currency || 'IRT').toUpperCase(),
          is_active: Boolean(u.is_active),
          created_at: u.created_at ? u.created_at.split('T')[0] : 'Recent',
          paid_balance: bal.paid_balance || 0,
          gift_balance: bal.gift_balance || 0,
          total_balance: bal.total_balance || 0,
          frozen_amount: bal.frozen_amount || 0,
          used_credit: bal.used_credit || 0,
          min_topup_amount: (bal as any).min_topup_amount
        };
      });

      setUsers(items);
      setTotalPages(usersRes?.total_pages || 1);
      setTotalUsersCount(usersRes?.total || items.length);

      if (selectedUserForDetails) {
        const updated = items.find(i => i.id === selectedUserForDetails.id);
        if (updated) setSelectedUserForDetails(updated);
      }
    } catch {
      showToast('Failed to load user records.', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Routes and History for Inspected User
  const fetchUserRoutes = async (userId: string) => {
    setLoadingRoutes(true);
    try {
      const res = await api.get<any>(`/api/node/servers/users/${userId}/routes`);
      if (res) {
        setUserActiveRoutes(res.active_configs || []);
        setUserBlockedRoutes(res.blocked_history || []);
        setAvailableServersForReassign(res.available_servers || []);
      }
    } catch {
      setUserActiveRoutes([]);
      setUserBlockedRoutes([]);
      setAvailableServersForReassign([]);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Fetch Telegram Info for Inspected User
  const fetchUserTelegramInfo = async (userId: string) => {
    setLoadingTelegram(true);
    try {
      const res = await api.get<any>(`/api/notifications/settings/users/${userId}/telegram-link`);
      if (res) {
        setUserTelegramInfo(res);
      }
    } catch {
      setUserTelegramInfo(null);
    } finally {
      setLoadingTelegram(false);
    }
  };

  // Revoke Telegram token for user
  const handleRevokeUserTelegram = async () => {
    if (!selectedUserForDetails) return;
    setRevokingTelegram(true);
    try {
      const res = await api.post<any>(`/api/notifications/settings/users/${selectedUserForDetails.id}/telegram-link/revoke`);
      if (res) {
        setUserTelegramInfo(res);
        showToast('Telegram token revoked and new link generated.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke Telegram token.', 'error');
    } finally {
      setRevokingTelegram(false);
    }
  };

  // Confirm and Execute User Status Toggle (Suspend / Activate)
  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    const nextStatus = !userToToggleStatus.is_active;
    setIsTogglingStatus(true);
    try {
      await api.patch(`/api/iam/users/${userToToggleStatus.id}/status?is_active=${nextStatus}`);

      showToast(`User @${userToToggleStatus.username} ${nextStatus ? 'Activated' : 'Suspended'}.`, 'success');
      setUsers(prev => prev.map(u => u.id === userToToggleStatus.id ? { ...u, is_active: nextStatus } : u));
      if (selectedUserForDetails && selectedUserForDetails.id === userToToggleStatus.id) {
        setSelectedUserForDetails({ ...selectedUserForDetails, is_active: nextStatus });
      }
      setUserToToggleStatus(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Fetch 30-Day Trends, ISP Statistics, Routes & Telegram Info for Inspected User
  useEffect(() => {
    if (!selectedUserForDetails) {
      setUserTrendData([]);
      setUserProviderStats([]);
      setUserActiveRoutes([]);
      setUserBlockedRoutes([]);
      setUserTelegramInfo(null);
      return;
    }

    fetchUserRoutes(selectedUserForDetails.id);
    fetchUserTelegramInfo(selectedUserForDetails.id);

    const fetchUserDetailsTelemetry = async () => {
      setLoadingUserTrends(true);
      setLoadingUserProviders(true);
      try {
        const [trafficRes, financialRes, providerRes] = await Promise.all([
          api.get<any[]>(`/api/traffic/admin/users/${selectedUserForDetails.id}/daily?days=30`).catch(() => []),
          api.get<any[]>(`/api/billing/analytics/admin/users/${selectedUserForDetails.id}/daily-financial-trends?days=30`).catch(() => []),
          api.get<{ total_bytes: number; providers: ProviderStatItem[] }>(`/api/traffic/admin/users/${selectedUserForDetails.id}/provider-stats`).catch(() => ({ total_bytes: 0, providers: [] }))
        ]);

        const trafficList = Array.isArray(trafficRes) ? trafficRes : [];
        const financialList = Array.isArray(financialRes) ? financialRes : [];

        const trafficMap = new Map(trafficList.map(t => [t.date_iso, t]));
        const financialMap = new Map(financialList.map(f => [f.date_iso, f]));

        const merged: UserTrendItem[] = [];
        const today = new Date();

        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const iso = d.toISOString().slice(0, 10);
          const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const tData = trafficMap.get(iso) || { bytes: 0, mb: 0 };
          const fData = financialMap.get(iso) || { topup_toman: 0, gift_toman: 0 };

          merged.push({
            day: dayLabel,
            date_iso: iso,
            data_bytes: Number(tData.bytes || 0),
            data_mb: Number(tData.mb || (Number(tData.bytes || 0) / (1024 ** 2))),
            topup_toman: Number(fData.topup_toman || 0),
            gift_toman: Number(fData.gift_toman || 0)
          });
        }

        setUserTrendData(merged);

        if (providerRes && Array.isArray(providerRes.providers)) {
          setUserProviderStats(providerRes.providers);
        } else {
          setUserProviderStats([]);
        }
      } catch {
        setUserTrendData([]);
        setUserProviderStats([]);
      } finally {
        setLoadingUserTrends(false);
        setLoadingUserProviders(false);
      }
    };

    fetchUserDetailsTelemetry();
  }, [selectedUserForDetails?.id]);

  const handleOpenDirectTopup = () => {
    const isUsd = selectedUserForDetails?.billing_currency === 'USD';
    const minReq = selectedUserForDetails?.min_topup_amount ?? (isUsd ? 2.0 : 50000);
    setDirectTopupAmount(isUsd ? minReq.toFixed(2) : String(minReq));
    setDirectTopupDesc('');
    setIsDirectTopupOpen(true);
  };

  const handleDirectTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDetails) return;

    const amt = parseFloat(directTopupAmount) || 0;
    if (amt < 50000) {
      showToast('Minimum direct top-up requirement is 50,000 Toman.', 'error');
      return;
    }

    setIsSubmittingTopup(true);
    try {
      await api.post('/api/billing/topups/admin-direct-topup', {
        client_id: selectedUserForDetails.id,
        amount: amt,
        payment_method: 'Direct Admin Deposit',
        description: directTopupDesc.trim() || undefined
      });

      showToast(`Successfully added ${amt.toLocaleString()} Toman top-up to @${selectedUserForDetails.username}`, 'success');
      setIsDirectTopupOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit direct top-up.', 'error');
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const handleOpenDirectRefund = () => {
    if (!selectedUserForDetails) return;
    setDirectRefundAmount(String(Math.max(0, selectedUserForDetails.paid_balance)));
    setDirectRefundAccount('Direct Admin Refund');
    setDirectRefundReason('');
    setIsDirectRefundOpen(true);
  };

  const handleDirectRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDetails) return;

    const amt = parseFloat(directRefundAmount) || 0;
    if (amt <= 0) {
      showToast('Refund amount must be greater than zero.', 'error');
      return;
    }

    if (amt > selectedUserForDetails.paid_balance) {
      showToast(`Cannot refund more than available paid credit (${selectedUserForDetails.paid_balance.toLocaleString()} T).`, 'error');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await api.post('/api/billing/refunds/admin-direct-refund', {
        client_id: selectedUserForDetails.id,
        amount: amt,
        destination_account: directRefundAccount.trim() || 'Direct Admin Refund',
        reason: directRefundReason.trim() || undefined
      });

      showToast(`Successfully issued refund of ${amt.toLocaleString()} Toman to @${selectedUserForDetails.username}`, 'success');
      setIsDirectRefundOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to execute direct refund.', 'error');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleOpenManualReassign = (route: any) => {
    setRouteToReassign(route);
    const matchingServers = availableServersForReassign.filter(s => s.location_id === route.location_id);
    const initialServer = matchingServers[0] || availableServersForReassign[0];
    if (initialServer) {
      setSelectedNewServerId(initialServer.id);
      setSelectedNewInboundId(initialServer.inbounds[0]?.inbound_id || 1);
    }
    setIsReassignModalOpen(true);
  };

  const handleExecuteManualReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDetails || !routeToReassign || !selectedNewServerId) return;

    setIsSubmittingReassign(true);
    try {
      const res = await api.post<any>(`/api/node/servers/users/${selectedUserForDetails.id}/manual-reassign`, {
        config_id: routeToReassign.id,
        location_id: routeToReassign.location_id,
        server_id: selectedNewServerId,
        inbound_id: selectedNewInboundId,
        reason: 'Admin manual re-assignment'
      });

      showToast(res.message || 'Route successfully reassigned on 3X-UI!', 'success');
      setIsReassignModalOpen(false);
      fetchUserRoutes(selectedUserForDetails.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to reassign route.', 'error');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const handleOpenAddConfig = () => {
    if (availableServersForReassign.length > 0) {
      const firstServer = availableServersForReassign[0];
      setAddConfigLocationId(firstServer.location_id || '');
      setAddConfigServerId(firstServer.id);
      setAddConfigInboundId(firstServer.inbounds[0]?.inbound_id || 1);
    }
    setIsAddConfigModalOpen(true);
  };

  const handleExecuteAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDetails || !addConfigServerId || !addConfigLocationId) return;

    setIsSubmittingAddConfig(true);
    try {
      const res = await api.post<any>(`/api/node/servers/users/${selectedUserForDetails.id}/configs`, {
        location_id: addConfigLocationId,
        server_id: addConfigServerId,
        inbound_id: addConfigInboundId
      });

      showToast(res.message || 'Configuration added and provisioned on 3X-UI!', 'success');
      setIsAddConfigModalOpen(false);
      fetchUserRoutes(selectedUserForDetails.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to add configuration.', 'error');
    } finally {
      setIsSubmittingAddConfig(false);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!selectedUserForDetails) return;
    setDeletingConfigId(configId);
    try {
      await api.delete(`/api/node/servers/users/${selectedUserForDetails.id}/configs/${configId}`);
      showToast('Configuration removed from 3X-UI and database.', 'success');
      fetchUserRoutes(selectedUserForDetails.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove configuration.', 'error');
    } finally {
      setDeletingConfigId(null);
    }
  };

  const handleToggleConfig = async (configId: string) => {
    if (!selectedUserForDetails) return;
    setTogglingConfigId(configId);
    try {
      const res = await api.patch<any>(`/api/node/servers/users/${selectedUserForDetails.id}/configs/${configId}/toggle`);
      showToast(res.message || 'Configuration status updated.', 'success');
      fetchUserRoutes(selectedUserForDetails.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle configuration.', 'error');
    } finally {
      setTogglingConfigId(null);
    }
  };

  const handleToggleStatus = async (userRec: UserRecord) => {
    const nextStatus = !userRec.is_active;
    try {
      await api.patch(`/api/iam/users/${userRec.id}/status?is_active=${nextStatus}`);

      showToast(`User @${userRec.username} ${nextStatus ? 'Activated (Configs provisioned)' : 'Suspended (Configs removed from 3X-UI)'}.`, 'success');
      setUsers(prev => prev.map(u => u.id === userRec.id ? { ...u, is_active: nextStatus } : u));
      if (selectedUserForDetails && selectedUserForDetails.id === userRec.id) {
        setSelectedUserForDetails({ ...selectedUserForDetails, is_active: nextStatus });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== 'valid' || emailStatus !== 'valid' || !isAddPasswordStrong) return;

    setIsCreatingUser(true);
    try {
      await api.post('/api/iam/users/admin/create-client', {
        username: addUsername.trim(),
        email: addEmail.trim(),
        password: addPassword,
        billing_currency: addBillingCurrency,
        initial_gift_balance: parseFloat(initialGift) || 0.0
      });

      showToast(`Client @${addUsername} (${addBillingCurrency}) created successfully!`, 'success');
      setIsAddUserModalOpen(false);
      setAddUsername('');
      setAddEmail('');
      setAddPassword('');
      setUsernameStatus(null);
      setEmailStatus(null);
      setUsernameMsg('');
      setEmailMsg('');
      setAddBillingCurrency('IRT');
      setInitialGift('0');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create client account.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleOpenGiftModal = (userRec: UserRecord, defaultAction: 'Credit' | 'Debit' = 'Credit') => {
    setSelectedUserForGift(userRec);
    setGiftAction(defaultAction);
    const isUsd = userRec.billing_currency === 'USD';
    setGiftAmount(isUsd ? '1.00' : '20000');
    setGiftReason('');
    setIsGiftModalOpen(true);
  };

  const handleGiftAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForGift) return;

    const amountNum = parseFloat(giftAmount) || 0;
    if (amountNum <= 0) {
      showToast('Amount must be greater than 0 Toman.', 'error');
      return;
    }

    if (giftAction === 'Debit' && amountNum > selectedUserForGift.gift_balance) {
      showToast(`Cannot deduct more than current gift balance (${selectedUserForGift.gift_balance.toLocaleString()} T).`, 'error');
      return;
    }

    setIsAdjustingGift(true);
    try {
      const res = await api.post<any>('/api/billing/topups/admin-gift-adjust', {
        client_id: selectedUserForGift.id,
        amount: amountNum,
        action: giftAction,
        reason: giftReason.trim() || undefined
      });

      showToast(res.message || 'Gift credit adjusted successfully!', 'success');

      const newGiftBalance = res.gift_balance !== undefined ? res.gift_balance : (
        giftAction === 'Credit' ? selectedUserForGift.gift_balance + amountNum : selectedUserForGift.gift_balance - amountNum
      );

      const updatedUser: UserRecord = {
        ...selectedUserForGift,
        gift_balance: newGiftBalance,
        total_balance: selectedUserForGift.paid_balance + newGiftBalance
      };

      setUsers(prev => prev.map(u => u.id === selectedUserForGift.id ? updatedUser : u));
      if (selectedUserForDetails && selectedUserForDetails.id === selectedUserForGift.id) {
        setSelectedUserForDetails(updatedUser);
      }
      setIsGiftModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust gift credit.', 'error');
    } finally {
      setIsAdjustingGift(false);
    }
  };

  const formatDataAxis = (valMB: number) => {
    if (valMB >= 1024) {
      return `${(valMB / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(valMB)} MB`;
  };

  const formatCurrencyAxis = (valToman: number) => {
    if (valToman >= 1000000) {
      return `${(valToman / 1000000).toFixed(1)}M T`;
    }
    if (valToman >= 1000) {
      return `${Math.round(valToman / 1000)}k T`;
    }
    return `${Math.round(valToman)} T`;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-[11px] font-mono font-bold select-none drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const giftNum = parseFloat(giftAmount) || 0;
  const isGiftDebitExceeding = giftAction === 'Debit' && selectedUserForGift && giftNum > selectedUserForGift.gift_balance;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in",
          toastMessage.type === 'success' ? "bg-zinc-950 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-rose-500/30 text-rose-400"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <UsersIcon size={20} className="text-emerald-400" />
            <span>Monitored Users</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Manage platform accounts, issue non-refundable gift credits, and monitor 30-day telemetry and ISP traffic shares.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin text-emerald-400")} />
          </button>

          <button 
            type="button"
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Add User Account</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 overflow-hidden space-y-4">
        
        {/* Search & Filter Header Bar */}
        <div className="p-3.5 border-b border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-zinc-950 p-0.5 border border-zinc-800/60 rounded-lg text-[11px] font-medium">
              {(['All', 'Active', 'Suspended'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                    statusFilter === st ? "bg-zinc-850 text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            <span className="text-xs text-zinc-500 font-mono pl-2">
              Total: <strong className="text-zinc-300">{totalUsersCount}</strong>
            </span>
          </div>
        </div>

        {/* 1. DESKTOP VIEW: DATA TABLE (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/60 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-950/20">
                <th className="py-3.5 px-5">User Account</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Currency</th>
                <th className="py-3.5 px-5">Available (Usable)</th>
                <th className="py-3.5 px-5">Frozen</th>
                <th className="py-3.5 px-5">Consumed</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-xs text-zinc-500 font-mono">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw size={14} className="animate-spin text-emerald-400" />
                      <span>Loading user records...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((userRec) => (
                  <tr 
                    key={userRec.id}
                    onClick={() => setSelectedUserForDetails(userRec)}
                    className="hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <User size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors block">
                            @{userRec.username}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono block truncate">{userRec.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 font-mono">
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded font-semibold uppercase border",
                        userRec.role === 'Admin' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        "bg-zinc-900 text-zinc-400 border-zinc-800"
                      )}>
                        {userRec.role}
                      </span>
                    </td>

                    {/* Dedicated Currency Column */}
                    <td className="py-3.5 px-5 font-mono">
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded font-bold uppercase border",
                        userRec.billing_currency === 'USD'
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                          : "bg-blue-500/15 border-blue-500/40 text-blue-400"
                      )}>
                        {userRec.billing_currency === 'USD' ? 'USD ($)' : 'IRT (Toman)'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-mono">
                      <div className="flex flex-col space-y-0.5">
                        <span className={cn("font-bold", userRec.paid_balance < 0 ? "text-rose-400" : "text-zinc-200")}>
                          {userRec.billing_currency === 'USD'
                            ? userRec.paid_balance < 0 ? `-$${Math.abs(userRec.paid_balance).toFixed(2)}` : `$${userRec.paid_balance.toFixed(2)}`
                            : userRec.paid_balance < 0 ? `-${Math.abs(Math.round(userRec.paid_balance)).toLocaleString()} T` : `${Math.round(userRec.paid_balance).toLocaleString()} T`} <span className="text-[10px] text-zinc-500 font-normal font-sans">(Paid)</span>
                        </span>
                        <span className={cn("text-xs font-bold", userRec.gift_balance > 0 ? "text-purple-400" : "text-zinc-500")}>
                          {userRec.billing_currency === 'USD' ? `$${userRec.gift_balance.toFixed(2)}` : `${Math.round(userRec.gift_balance).toLocaleString()} T`} <span className="text-[10px] text-zinc-500 font-normal font-sans">(Gift)</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 font-mono">
                      <span className={cn("font-bold text-xs flex items-center gap-1", userRec.frozen_amount > 0 ? "text-amber-400" : "text-zinc-500")}>
                        {userRec.frozen_amount > 0 && <Lock size={10} className="shrink-0" />}
                        {userRec.billing_currency === 'USD' ? `$${userRec.frozen_amount.toFixed(2)}` : `${userRec.frozen_amount.toLocaleString()} T`}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-mono">
                      <span className="font-bold text-blue-400 flex items-center gap-1">
                        <TrendingUp size={12} className="shrink-0 text-blue-500" />
                        {userRec.billing_currency === 'USD' ? `$${userRec.used_credit.toFixed(2)}` : `${userRec.used_credit.toLocaleString()} T`}
                      </span>
                    </td>

                    <td className="py-3.5 px-5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border",
                        userRec.is_active 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        <span className={cn("w-1 h-1 rounded-full mr-1.5", userRec.is_active ? "bg-emerald-500" : "bg-rose-500")} />
                        {userRec.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenGiftModal(userRec, 'Credit')}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-purple-300 hover:text-white rounded-lg text-xs font-medium transition-colors inline-flex items-center space-x-1 cursor-pointer"
                          title="Adjust Gift Credit"
                        >
                          <Gift size={12} className="text-purple-400" />
                          <span>Gift (+/-)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUserToToggleStatus(userRec)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-colors cursor-pointer",
                            userRec.is_active
                              ? "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-amber-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          )}
                          title={userRec.is_active ? "Suspend Account" : "Activate Account"}
                        >
                          {userRec.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedUserForDetails(userRec)}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                          title="View Details & Usage Trends"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-zinc-500">
                    No users match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 2. TABLET & MOBILE VIEW: CARDS (< lg) */}
        <div className="block lg:hidden p-3.5 sm:p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading users...</div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((userRec) => (
                <div 
                  key={userRec.id}
                  onClick={() => setSelectedUserForDetails(userRec)}
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors cursor-pointer"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xs shrink-0">
                          <User size={14} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-zinc-100 truncate">@{userRec.username}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono truncate block">{userRec.email}</span>
                        </div>
                      </div>

                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border shrink-0",
                        userRec.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {userRec.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-850 grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-zinc-500 block uppercase font-sans">Paid Balance</span>
                        <span className={cn("font-bold", userRec.paid_balance < 0 ? "text-rose-400" : "text-zinc-200")}>
                          {userRec.paid_balance.toLocaleString()} T
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-purple-400 block uppercase font-sans">Gift Balance</span>
                        <span className="text-purple-400 font-bold">{userRec.gift_balance.toLocaleString()} T</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenGiftModal(userRec, 'Credit')}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-purple-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                    >
                      <Gift size={12} className="text-purple-400" />
                      <span>Gift Credit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserToToggleStatus(userRec)}
                      className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-lg text-xs transition-colors"
                    >
                      {userRec.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              No users found matching query.
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-zinc-800/40 bg-zinc-950/40 flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Page {page} of {totalPages}</span>
            <div className="flex space-x-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* DRAWER: USER DETAILS WITH 30-DAY DIAGRAM, ISP SHARE & SERVER INBOUNDS */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedUserForDetails && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex justify-end">
            <div className="absolute inset-0" onClick={() => setSelectedUserForDetails(null)} />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-2xl sm:max-w-3xl h-full bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="p-5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                      <User size={16} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-zinc-100 truncate">@{selectedUserForDetails.username}</h3>
                      <span className="text-[11px] text-zinc-500 font-mono">{selectedUserForDetails.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border",
                      selectedUserForDetails.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}>
                      {selectedUserForDetails.is_active ? 'Active' : 'Suspended'}
                    </span>

                    <button 
                      type="button"
                      onClick={() => setSelectedUserForDetails(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Drawer Body Content */}
                <div className="p-5 sm:p-6 space-y-5 text-xs">
                  
                  {/* Balance Metrics Strip (Dynamic $ vs Toman) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                    <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col justify-between">
                      <span className="text-[9px] text-zinc-500 block uppercase font-sans">Paid Balance</span>
                      <span className={cn("text-sm font-bold mt-0.5 block", selectedUserForDetails.paid_balance < 0 ? "text-rose-400" : "text-zinc-100")}>
                        {selectedUserForDetails.billing_currency === 'USD'
                          ? selectedUserForDetails.paid_balance < 0 ? `-$${Math.abs(selectedUserForDetails.paid_balance).toFixed(2)}` : `$${selectedUserForDetails.paid_balance.toFixed(2)}`
                          : selectedUserForDetails.paid_balance < 0 ? `-${Math.abs(Math.round(selectedUserForDetails.paid_balance)).toLocaleString()} T` : `${Math.round(selectedUserForDetails.paid_balance).toLocaleString()} T`}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/30 flex flex-col justify-between">
                      <span className="text-[9px] text-purple-400 block uppercase font-sans">Gift Credit</span>
                      <span className="text-sm font-bold text-purple-300 mt-0.5 block">
                        {selectedUserForDetails.billing_currency === 'USD'
                          ? `$${selectedUserForDetails.gift_balance.toFixed(2)}`
                          : `${Math.round(selectedUserForDetails.gift_balance).toLocaleString()} T`}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/10 border border-amber-800/30 flex flex-col justify-between">
                      <span className="text-[9px] text-amber-500 block uppercase font-sans flex items-center gap-1">
                        <Lock size={10} className="shrink-0" /> Frozen
                      </span>
                      <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                        {selectedUserForDetails.billing_currency === 'USD'
                          ? `$${selectedUserForDetails.frozen_amount.toFixed(2)}`
                          : `${selectedUserForDetails.frozen_amount.toLocaleString()} T`}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-950/10 border border-blue-800/30 flex flex-col justify-between">
                      <span className="text-[9px] text-blue-400 block uppercase font-sans flex items-center gap-1">
                        <TrendingUp size={10} className="shrink-0" /> Consumed
                      </span>
                      <span className="text-sm font-bold text-blue-400 mt-0.5 block">
                        {selectedUserForDetails.billing_currency === 'USD'
                          ? `$${selectedUserForDetails.used_credit.toFixed(2)}`
                          : `${selectedUserForDetails.used_credit.toLocaleString()} T`}
                      </span>
                    </div>
                  </div>

                  {/* Actions Group: Direct Top-Up, Direct Refund, Gift and Status */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenDirectTopup}
                      className="py-2 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <ArrowDownLeft size={13} />
                      <span>Add Top-Up</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenDirectRefund}
                      className="py-2 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <ArrowUpRight size={13} />
                      <span>Add Refund</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGiftModal(selectedUserForDetails, 'Credit')}
                      className="py-2 px-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Gift size={13} />
                      <span>Gift (+/-)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserToToggleStatus(selectedUserForDetails)}
                      className="py-2 px-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      {selectedUserForDetails.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                      <span>{selectedUserForDetails.is_active ? "Suspend" : "Activate"}</span>
                    </button>
                  </div>

                  {/* TELEGRAM LINK & TOKEN SECTION */}
                  <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <Bot size={15} className="text-emerald-400" />
                        <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                          Telegram Notification Token & Link
                        </h4>
                      </div>

                      <span className={cn(
                        "text-[9px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 font-semibold",
                        userTelegramInfo?.is_connected
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-950 text-zinc-500 border-zinc-800"
                      )}>
                        {userTelegramInfo?.is_connected ? `Connected (ID: ${userTelegramInfo.telegram_id})` : "Not Connected"}
                      </span>
                    </div>

                    {loadingTelegram ? (
                      <div className="py-4 text-center text-xs text-zinc-500 font-mono flex items-center justify-center space-x-2">
                        <RefreshCw size={13} className="animate-spin text-emerald-400" />
                        <span>Loading Telegram info...</span>
                      </div>
                    ) : userTelegramInfo ? (
                      <div className="space-y-2.5">
                        {/* Token Box */}
                        <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                              Linking Token
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(userTelegramInfo.token);
                                setCopiedTgToken(true);
                                showToast('Token copied to clipboard!');
                                setTimeout(() => setCopiedTgToken(false), 2000);
                              }}
                              className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 cursor-pointer font-mono"
                            >
                              {copiedTgToken ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              <span>{copiedTgToken ? 'Copied' : 'Copy Token'}</span>
                            </button>
                          </div>
                          <p className="font-mono text-xs text-emerald-400 select-all truncate font-semibold">
                            {userTelegramInfo.token}
                          </p>
                        </div>

                        {/* Bot Link Box */}
                        <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                              Telegram Deep Link
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(userTelegramInfo.telegram_link);
                                  setCopiedTgLink(true);
                                  showToast('Link copied to clipboard!');
                                  setTimeout(() => setCopiedTgLink(false), 2000);
                                }}
                                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 cursor-pointer font-mono"
                              >
                                {copiedTgLink ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                <span>{copiedTgLink ? 'Copied' : 'Copy Link'}</span>
                              </button>
                              <a
                                href={userTelegramInfo.telegram_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-zinc-400 hover:text-emerald-400 flex items-center space-x-1 font-mono"
                              >
                                <ExternalLink size={11} />
                                <span>Open</span>
                              </a>
                            </div>
                          </div>
                          <p className="font-mono text-[11px] text-zinc-400 select-all truncate">
                            {userTelegramInfo.telegram_link}
                          </p>
                        </div>

                        {/* Revoke Button */}
                        <div className="flex justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={handleRevokeUserTelegram}
                            disabled={revokingTelegram}
                            className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                            title="Invalidate current token and generate a new one"
                          >
                            <RefreshCw size={12} className={cn(revokingTelegram && "animate-spin text-emerald-400")} />
                            <span>{revokingTelegram ? "Revoking..." : "Revoke Token & Link"}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-xs text-zinc-500">
                        No Telegram preferences found for this user.
                      </div>
                    )}
                  </div>

                  {/* SECTION: SERVER CONFIGURATIONS & BLOCKED ROUTE HISTORY */}
                  <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2.5">
                      <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                        <div className="flex items-center space-x-2">
                          <Server size={15} className="text-emerald-400" />
                          <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                            Assigned Configurations
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={handleOpenAddConfig}
                          className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Plus size={12} />
                          <span>Add Config</span>
                        </button>
                      </div>

                      {/* View Switcher: Current vs History */}
                      <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-855 text-[11px] font-medium self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setRoutesTab('current')}
                          className={cn(
                            "px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1",
                            routesTab === 'current' ? "bg-zinc-850 text-emerald-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          <span>Current In-Use</span>
                          <span className="font-mono text-[10px]">({userActiveRoutes.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoutesTab('history')}
                          className={cn(
                            "px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center space-x-1",
                            routesTab === 'history' ? "bg-zinc-850 text-amber-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          <span>Previously Blocked</span>
                          <span className="font-mono text-[10px]">({userBlockedRoutes.length})</span>
                        </button>
                      </div>
                    </div>

                    {loadingRoutes ? (
                      <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                        <RefreshCw size={13} className="animate-spin text-emerald-400 mx-auto mb-1" />
                        <span>Loading server configurations...</span>
                      </div>
                    ) : routesTab === 'current' ? (
                      /* CURRENT IN-USE CONFIGS */
                      userActiveRoutes.length > 0 ? (
                        <div className="space-y-2.5">
                          {userActiveRoutes.map((route) => (
                            <div key={route.id} className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-2 text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <span className="text-xl select-none shrink-0">{route.location_flag}</span>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-zinc-100 truncate">{route.location_name}</h5>
                                    <p className="text-[11px] text-zinc-400 font-mono truncate">
                                      {route.server_name} {route.server_ip ? `(${route.server_ip})` : ''}
                                    </p>
                                  </div>
                                </div>

                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border shrink-0",
                                  route.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-850 border-zinc-800 text-zinc-500"
                                )}>
                                  {route.is_active ? 'Online' : 'Disabled'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-850/80 font-mono text-[11px]">
                                <div>
                                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Inbound Tag</span>
                                  <span className="text-zinc-300 font-semibold truncate block">{route.inbound_tag}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Protocol / Port</span>
                                  <span className="text-emerald-400 font-bold">{route.protocol} :{route.port}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-[9px] text-zinc-500 block uppercase font-sans">Host / SNI</span>
                                  <span className="text-zinc-300 truncate block">{route.host_or_sni || 'Default SNI'}</span>
                                </div>
                              </div>

                              <div className="pt-1 flex items-center justify-between gap-2">
                                <div className="flex items-center space-x-1.5">
                                  {route.uri && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(route.uri);
                                          setCopiedUriId(route.id);
                                          showToast('VLESS URI copied!');
                                          setTimeout(() => setCopiedUriId(null), 2000);
                                        }}
                                        className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-md text-[10px] font-medium flex items-center space-x-1 cursor-pointer"
                                      >
                                        {copiedUriId === route.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                        <span>{copiedUriId === route.id ? 'Copied' : 'URI'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setQrModalUrl(route.uri)}
                                        className="p-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-md cursor-pointer"
                                        title="View QR"
                                      >
                                        <QrCode size={12} />
                                      </button>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleConfig(route.id)}
                                    disabled={togglingConfigId === route.id}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                                    title={route.is_active ? "Disable on 3X-UI" : "Enable on 3X-UI"}
                                  >
                                    {route.is_active ? 'Disable' : 'Enable'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenManualReassign(route)}
                                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                    title="Reassign server and inbound"
                                  >
                                    <RotateCcw size={11} />
                                    <span>Reassign</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteConfig(route.id)}
                                    disabled={deletingConfigId === route.id}
                                    className="p-1 bg-zinc-900 hover:bg-rose-500/15 border border-zinc-800 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                                    title="Remove from 3X-UI and database"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                          No active configurations provisioned for this user.
                        </div>
                      )
                    ) : (
                      /* PREVIOUSLY BLOCKED / REPLACED ROUTES HISTORY */
                      userBlockedRoutes.length > 0 ? (
                        <div className="space-y-2">
                          {userBlockedRoutes.map((b) => (
                            <div key={b.id} className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl flex items-center justify-between gap-2 text-xs">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-base select-none">{b.location_flag}</span>
                                  <span className="font-bold text-zinc-300 truncate">{b.location_name}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono">({b.server_name})</span>
                                </div>
                                <div className="flex items-center space-x-2 font-mono text-[10px] text-zinc-400">
                                  <span className="text-rose-400">Inbound #{b.inbound_id} ({b.protocol})</span>
                                  <span>•</span>
                                  <span className="text-zinc-500">SNI: {b.host_or_sni}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono uppercase block">
                                  Blocked
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono block mt-1">
                                  {b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                          No blocked route history recorded for this user.
                        </div>
                      )
                    )}
                  </div>

                  {/* 2-COLUMN GRID: 30-DAY DIAGRAM + ISP TRAFFIC SHARE */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Left 2-Cols: 30-Day Dual-Axis Bandwidth + Top-ups + Gifts */}
                    <div className="lg:col-span-2 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800/50 pb-2.5">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity size={14} className="text-emerald-400" />
                            <span>30-Day Usage & Top-Ups</span>
                          </h4>
                          <p className="text-[10px] text-zinc-400">
                            {selectedUserForDetails.billing_currency === 'USD'
                              ? "Left: Bandwidth (MB/GB). Right: Top-ups (Green) in USD ($)."
                              : "Left: Bandwidth (MB/GB). Right: Top-ups (Green) in Toman."}
                          </p>
                        </div>
                      </div>

                      <div className="h-56 w-full pt-1">
                        {loadingUserTrends ? (
                          <div className="h-full w-full flex items-center justify-center space-x-2 text-zinc-500 font-mono text-xs">
                            <RefreshCw size={14} className="animate-spin text-emerald-400" />
                            <span>Loading 30-day pattern...</span>
                          </div>
                        ) : userTrendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userTrendData} margin={{ top: 12, right: 10, left: -15, bottom: 0 }}>
                              <defs>
                                <linearGradient id="userBandwidthGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#00b4d8" stopOpacity={0.35}/>
                                  <stop offset="100%" stopColor="#00b4d8" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>

                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />

                              <XAxis 
                                dataKey="day" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#71717a', fontSize: 9 }} 
                                dy={4} 
                                interval="preserveStartEnd"
                              />

                              {/* Left Y-Axis: Bandwidth with Headroom */}
                              <YAxis 
                                yAxisId="left"
                                orientation="left"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#00b4d8', fontSize: 9 }}
                                tickFormatter={formatDataAxis}
                                width={50}
                                domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 100)]}
                              />

                              {/* Right Y-Axis: Dynamic Dollar ($) vs Toman Scaling */}
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#10b981', fontSize: 9 }}
                                tickFormatter={(val: number) => {
                                  if (selectedUserForDetails.billing_currency === 'USD') {
                                    return `$${val.toFixed(val >= 10 ? 0 : 2)}`;
                                  }
                                  return formatCurrencyAxis(val);
                                }}
                                width={50}
                                domain={[
                                  0, 
                                  (dataMax: number) => {
                                    if (selectedUserForDetails.billing_currency === 'USD') {
                                      return dataMax > 0 ? Math.ceil(dataMax * 1.35) : 10;
                                    }
                                    return dataMax > 0 ? Math.ceil(dataMax * 1.35) : 10000;
                                  }
                                ]}
                              />

                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#09090b', 
                                  borderColor: '#27272a', 
                                  borderRadius: '0.75rem', 
                                  fontSize: '11px', 
                                  color: '#f4f4f5' 
                                }}
                                formatter={(value: any, name: string) => {
                                  if (name === "Bandwidth") {
                                    return [formatDataAxis(Number(value)), name];
                                  }
                                  if (selectedUserForDetails.billing_currency === 'USD') {
                                    return [`$${Number(value).toFixed(2)} USD`, name];
                                  }
                                  return [`${Number(value).toLocaleString()} Toman`, name];
                                }}
                                labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                              />

                              <Legend 
                                verticalAlign="top" 
                                height={28}
                                content={({ payload }) => (
                                  <div className="flex flex-wrap items-center justify-end gap-2.5 text-xs font-medium text-zinc-400 pb-1">
                                    {payload?.map((entry: any, index: number) => (
                                      <div key={`legend-${index}`} className="flex items-center space-x-1">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-[10px]">{entry.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              />

                              {/* Bandwidth Area (Left Axis) */}
                              <Area 
                                yAxisId="left"
                                type="monotone" 
                                name="Bandwidth"
                                dataKey="data_mb" 
                                stroke="#00b4d8" 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill="url(#userBandwidthGrad)" 
                              />

                              {/* Approved Top-ups (Right Axis) */}
                              <Line 
                                yAxisId="right"
                                type="monotone"
                                name="Approved Top-ups"
                                dataKey="topup_toman"
                                stroke="#10b981"
                                strokeWidth={2.2}
                                dot={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  if (!payload || !payload.topup_toman || payload.topup_toman <= 0) return <></>;
                                  return (
                                    <circle 
                                      key={`dot-topup-${cx}-${cy}`} 
                                      cx={cx} 
                                      cy={cy} 
                                      r={3.5} 
                                      fill="#10b981" 
                                      stroke="#09090b" 
                                      strokeWidth={1.5} 
                                    />
                                  );
                                }}
                                activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs font-mono">
                            No 30-day activity recorded for this user.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right 1-Col: ISP Traffic Share Pie Chart & Percentages */}
                    <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-4 flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <PieIcon size={14} className="text-emerald-400" />
                          <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                            ISP Traffic Share
                          </h4>
                        </div>
                      </div>

                      {/* Pie Chart Display Area */}
                      <div className="h-36 w-full flex items-center justify-center relative">
                        {loadingUserProviders ? (
                          <div className="text-center text-zinc-500 text-xs font-mono">
                            <RefreshCw size={14} className="animate-spin text-emerald-400 mx-auto mb-1" />
                            <span>Loading ISP stats...</span>
                          </div>
                        ) : groupedUserProviders.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={groupedUserProviders}
                                dataKey="percentage"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                innerRadius={0}
                                labelLine={false}
                                label={renderCustomizedLabel}
                                stroke="#09090b"
                                strokeWidth={2}
                              >
                                {groupedUserProviders.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '11px', color: '#f4f4f5' }}
                                formatter={(val: any, name: string) => {
                                  const prov = groupedUserProviders.find(p => p.name === name);
                                  const mb = ((prov?.bytes || 0) / (1024 ** 2)).toFixed(1);
                                  const ipList = prov?.ips && prov.ips.length > 0 ? `\nIPs: ${prov.ips.join(', ')}` : '';
                                  return [`${val}% (${mb} MB)${ipList}`, name];
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center space-y-1 text-zinc-500 text-xs font-mono">
                            <Radio size={20} className="mx-auto text-zinc-700 mb-1" />
                            <p className="text-[11px]">No active connections</p>
                            <p className="text-[9px] text-zinc-600">Cellular / Fiber ISPs auto-detected</p>
                          </div>
                        )}
                      </div>

                      {/* Provider Share Legend List Grouped by ISP */}
                      <div className="space-y-1.5 pt-1 border-t border-zinc-850/60 max-h-28 overflow-y-auto pr-1">
                        {groupedUserProviders.length > 0 ? (
                          groupedUserProviders.map((prov, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-0.5">
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <span 
                                  className="w-2 h-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: prov.color || DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length] }} 
                                />
                                <span className="text-zinc-200 truncate text-[10px] font-medium" title={prov.name}>
                                  {prov.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] font-bold text-zinc-100 shrink-0 ml-2">
                                {prov.percentage}%
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[9px] text-zinc-500 text-center py-1">
                            Cellular (MCI, Irancell) and Home Fiber subnets categorized automatically.
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
                <button 
                  type="button"
                  onClick={() => setSelectedUserForDetails(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: ADD STANDALONE CLIENT ACCOUNT */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <UsersIcon size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Create Client Account</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAddUserModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateClientSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Username</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. client_alex"
                    value={addUsername}
                    onChange={e => setAddUsername(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700 font-mono"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {usernameLoading && <RefreshCw size={12} className="animate-spin text-emerald-400" />}
                    {!usernameLoading && usernameStatus === 'valid' && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {!usernameLoading && usernameStatus === 'invalid' && <XCircle size={13} className="text-rose-500" />}
                  </div>
                </div>
                {usernameMsg && (
                  <p className={`text-[10px] flex items-center gap-1 ${usernameStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {usernameStatus === 'valid' ? <Check size={10} /> : <X size={10} />}
                    <span>{usernameMsg}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    placeholder="alex@example.com"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700 font-mono"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {emailLoading && <RefreshCw size={12} className="animate-spin text-emerald-400" />}
                    {!emailLoading && emailStatus === 'valid' && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {!emailLoading && emailStatus === 'invalid' && <XCircle size={13} className="text-rose-500" />}
                  </div>
                </div>
                {emailMsg && (
                  <p className={`text-[10px] flex items-center gap-1 ${emailStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {emailStatus === 'valid' ? <Check size={10} /> : <X size={10} />}
                    <span>{emailMsg}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-400 block">Temporary Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="Min. 8 characters with numbers & symbols"
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Password Complexity Progress & Checklist */}
                {addPassword.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[10px] font-medium">
                      <span className="text-zinc-500">Complexity</span>
                      <span className={
                        addPasswordScore <= 2 ? 'text-rose-400' :
                        addPasswordScore < 6 ? 'text-amber-400' : 'text-emerald-400'
                      }>
                        {addPasswordScore <= 2 ? 'Weak' : addPasswordScore < 6 ? 'Fair' : 'Strong'}
                      </span>
                    </div>

                    <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4, 5, 6].map((step) => (
                        <div 
                          key={step} 
                          className={`h-full flex-1 rounded-full transition-all ${
                            step <= addPasswordScore 
                              ? addPasswordScore <= 2 ? 'bg-rose-500' : addPasswordScore < 6 ? 'bg-amber-400' : 'bg-emerald-400' 
                              : 'bg-zinc-850'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500 pt-0.5">
                      <div className={`flex items-center gap-1 ${addPasswordReqs.minLength ? 'text-emerald-400' : ''}`}>
                        {addPasswordReqs.minLength ? <Check size={10} /> : <X size={10} />}
                        <span>Min 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1 ${addPasswordReqs.hasUpper ? 'text-emerald-400' : ''}`}>
                        {addPasswordReqs.hasUpper ? <Check size={10} /> : <X size={10} />}
                        <span>Uppercase (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${addPasswordReqs.hasLower ? 'text-emerald-400' : ''}`}>
                        {addPasswordReqs.hasLower ? <Check size={10} /> : <X size={10} />}
                        <span>Lowercase (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${addPasswordReqs.hasNumber ? 'text-emerald-400' : ''}`}>
                        {addPasswordReqs.hasNumber ? <Check size={10} /> : <X size={10} />}
                        <span>Number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${addPasswordReqs.hasSpecial ? 'text-emerald-400' : ''}`}>
                        {addPasswordReqs.hasSpecial ? <Check size={10} /> : <X size={10} />}
                        <span>Special symbol (!@#$)</span>
                      </div>
                      <div className={`flex items-center gap-1 ${addPasswordReqs.notCommon ? 'text-emerald-400' : ''}`}>
                        {addPasswordReqs.notCommon ? <Check size={10} /> : <X size={10} />}
                        <span>Not common</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Currency Selection (Option B) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 block">
                  Account Currency Zone <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddBillingCurrency('IRT');
                      if (initialGift === '0.50' || initialGift === '0.5') setInitialGift('20000');
                    }}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5",
                      addBillingCurrency === 'IRT'
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-xs"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <span>🇮🇷</span>
                    <span>Toman (IRT)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddBillingCurrency('USD');
                      if (initialGift === '20000' || initialGift === '0') setInitialGift('0.50');
                    }}
                    className={cn(
                      "py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5",
                      addBillingCurrency === 'USD'
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-xs"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <span>🌍</span>
                    <span>Dollar (USD $)</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-purple-400 block">
                  Initial Gift Credit ({addBillingCurrency === 'USD' ? 'USD $' : 'Toman'})
                </label>
                <input 
                  type="number"
                  min="0"
                  step={addBillingCurrency === 'USD' ? "0.01" : "1000"}
                  value={initialGift}
                  onChange={e => setInitialGift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-100 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser || usernameStatus !== 'valid' || emailStatus !== 'valid' || !isAddPasswordStrong}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isCreatingUser ? "Creating..." : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN GIFT CREDIT ADJUSTER */}
      {isGiftModalOpen && selectedUserForGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                  <Gift size={15} className="text-purple-400" />
                  <span>Adjust Gift: @{selectedUserForGift.username}</span>
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Current Gift: <strong className="text-purple-400">{selectedUserForGift.gift_balance.toLocaleString()} T</strong>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsGiftModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleGiftAdjustSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setGiftAction('Credit')}
                  className={cn(
                    "py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1",
                    giftAction === 'Credit' ? "bg-zinc-850 text-purple-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <PlusCircle size={13} />
                  <span>Add Gift (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGiftAction('Debit')}
                  className={cn(
                    "py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1",
                    giftAction === 'Debit' ? "bg-zinc-850 text-rose-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <MinusCircle size={13} />
                  <span>Deduct Gift (-)</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-zinc-400">
                    Gift Amount (Toman) <span className="text-purple-400">*</span>
                  </label>
                  {giftAction === 'Debit' && (
                    <button
                      type="button"
                      onClick={() => setGiftAmount(String(selectedUserForGift.gift_balance))}
                      className="text-[10px] font-mono text-purple-400 hover:underline cursor-pointer"
                    >
                      Max ({selectedUserForGift.gift_balance.toLocaleString()} T)
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={giftAmount}
                    onChange={e => setGiftAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono font-semibold text-zinc-100 outline-none focus:border-zinc-700"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                    Toman
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">
                  Adjustment Memo (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Courtesy Gift"
                  value={giftReason}
                  onChange={e => setGiftReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              {isGiftDebitExceeding && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Cannot deduct more than available gift balance.</span>
                </p>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingGift || giftNum <= 0 || Boolean(isGiftDebitExceeding)}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isAdjustingGift ? "Processing..." : `Confirm ${giftAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIRECT TOP-UP BY ADMIN */}
      {isDirectTopupOpen && selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-emerald-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ArrowDownLeft size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Direct Top-Up</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">@{selectedUserForDetails.username}</span>
                </div>
              </div>
              <button type="button" onClick={() => setIsDirectTopupOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleDirectTopupSubmit} className="space-y-3.5 text-xs">
              <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-400 block font-medium">Deposit Rule Policy:</span>
                <span className="text-zinc-300 font-mono text-[11px] block">
                  Minimum required deposit:{' '}
                  <strong className="text-emerald-400">
                    {selectedUserForDetails.billing_currency === 'USD' 
                      ? `$${(selectedUserForDetails.min_topup_amount ?? 2.0).toFixed(2)} USD` 
                      : `${(selectedUserForDetails.min_topup_amount ?? 50000).toLocaleString()} Toman`}
                  </strong>
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300 block">
                  Top-Up Amount ({selectedUserForDetails.billing_currency === 'USD' ? 'USD $' : 'Toman'}) <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={selectedUserForDetails.min_topup_amount ?? (selectedUserForDetails.billing_currency === 'USD' ? 2 : 50000)}
                    step={selectedUserForDetails.billing_currency === 'USD' ? "0.01" : "1000"}
                    required
                    value={directTopupAmount}
                    onChange={e => setDirectTopupAmount(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-100 outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-mono font-bold pointer-events-none">
                    {selectedUserForDetails.billing_currency === 'USD' ? '$' : 'T'}
                  </span>
                </div>

                {/* Presets (Adapted by Currency) */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(selectedUserForDetails.billing_currency === 'USD' ? ['2.00', '5.00', '10.00', '20.00'] : ['50000', '100000', '200000', '500000']).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDirectTopupAmount(preset)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors cursor-pointer",
                        directTopupAmount === preset ? "bg-zinc-800 text-emerald-400 border-emerald-500/40" : "bg-zinc-950 border-zinc-850 text-zinc-400"
                      )}
                    >
                      +{selectedUserForDetails.billing_currency === 'USD' ? `$${preset}` : `${parseInt(preset).toLocaleString()} T`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Description / Memo (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Received via Bank Transfer"
                  value={directTopupDesc}
                  onChange={e => setDirectTopupDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDirectTopupOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopup || (parseFloat(directTopupAmount) || 0) < 50000}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmittingTopup ? "Processing..." : "Add Top-Up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DIRECT REFUND BY ADMIN */}
      {isDirectRefundOpen && selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-rose-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ArrowUpRight size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Direct Refund</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">@{selectedUserForDetails.username}</span>
                </div>
              </div>
              <button type="button" onClick={() => setIsDirectRefundOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleDirectRefundSubmit} className="space-y-3.5 text-xs">
              <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-400 block font-medium">Refund Rule Policy:</span>
                <span className="text-zinc-300 font-mono text-[11px] block">
                  Refundable Paid Balance: <strong className="text-emerald-400">{Math.max(0, selectedUserForDetails.paid_balance).toLocaleString()} Toman</strong>
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  (Gift credits are non-refundable and cannot be withdrawn.)
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-zinc-300">
                    Refund Amount (Toman) <span className="text-rose-400">*</span>
                  </label>
                  {selectedUserForDetails.paid_balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setDirectRefundAmount(String(selectedUserForDetails.paid_balance))}
                      className="text-[10px] font-mono text-rose-400 hover:underline cursor-pointer"
                    >
                      Max ({selectedUserForDetails.paid_balance.toLocaleString()} T)
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={Math.max(0, selectedUserForDetails.paid_balance)}
                    step="1000"
                    required
                    value={directRefundAmount}
                    onChange={e => setDirectRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-100 outline-none focus:border-rose-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">Toman</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Destination Shetab Card / Account</label>
                <input
                  type="text"
                  placeholder="e.g. 6037-xxxx-xxxx-xxxx"
                  value={directRefundAccount}
                  onChange={e => setDirectRefundAccount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Reason / Memo (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Unused balance direct refund"
                  value={directRefundReason}
                  onChange={e => setDirectRefundReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDirectRefundOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingRefund || 
                    selectedUserForDetails.paid_balance <= 0 || 
                    (parseFloat(directRefundAmount) || 0) <= 0 || 
                    (parseFloat(directRefundAmount) || 0) > selectedUserForDetails.paid_balance
                  }
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmittingRefund ? "Processing..." : "Issue Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: MANUAL ROUTE REASSIGNMENT */}
      {isReassignModalOpen && routeToReassign && selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <RotateCcw size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Manual Route Reassignment</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {routeToReassign.location_flag} {routeToReassign.location_name} • @{selectedUserForDetails.username}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setIsReassignModalOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleExecuteManualReassign} className="space-y-3.5 text-xs">
              {/* Current Active Route Banner */}
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Current Route (To Be Replaced)</span>
                <p className="text-zinc-200 font-semibold">{routeToReassign.server_name}</p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {routeToReassign.inbound_tag} ({routeToReassign.protocol}) • SNI: {routeToReassign.host_or_sni || 'Default'}
                </p>
              </div>

              {/* Select New Server */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300 block">
                  Select Target Server Node <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={selectedNewServerId}
                  onChange={e => {
                    const sid = e.target.value;
                    setSelectedNewServerId(sid);
                    const srv = availableServersForReassign.find(s => s.id === sid);
                    if (srv && srv.inbounds && srv.inbounds[0]) {
                      setSelectedNewInboundId(srv.inbounds[0].inbound_id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-zinc-700"
                >
                  {availableServersForReassign
                    .filter(s => s.location_id === routeToReassign.location_id)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.inbounds?.length || 0} inbounds)
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Inbound on that server */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300 block">
                  Select Target Inbound & Protocol <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={selectedNewInboundId}
                  onChange={e => setSelectedNewInboundId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-zinc-700 font-mono"
                >
                  {(availableServersForReassign.find(s => s.id === selectedNewServerId)?.inbounds || []).map((inb: any) => (
                    <option key={inb.inbound_id} value={inb.inbound_id}>
                      #{inb.inbound_id} - {inb.tag} ({inb.protocol.toUpperCase()}:{inb.port}) {inb.domain_or_ip ? `[SNI: ${inb.domain_or_ip}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-zinc-500 leading-relaxed">
                The old configuration will be cleaned up from the 3X-UI panel and logged into the user's blocked route history.
              </p>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReassign || !selectedNewServerId}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmittingReassign ? "Reassigning..." : "Confirm Reassignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal for In-Use Configs */}
      {qrModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl relative">
            <button type="button" onClick={() => setQrModalUrl(null)} className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-200 cursor-pointer">
              <X size={15} />
            </button>
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Configuration QR Code</h4>
            <div className="flex justify-center">
              <QRCodeView value={qrModalUrl} size={160} />
            </div>
            <p className="text-[10px] font-mono text-zinc-400 break-all select-all">{qrModalUrl}</p>
            <button
              type="button"
              onClick={() => setQrModalUrl(null)}
              className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}


      {/* MODAL 6: ADMIN ADD CONFIG FOR USER */}
      {isAddConfigModalOpen && selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Add User Configuration</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">@{selectedUserForDetails.username}</span>
                </div>
              </div>
              <button type="button" onClick={() => setIsAddConfigModalOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleExecuteAddConfig} className="space-y-3.5 text-xs">
              {/* Select Location / Region */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300 block">
                  Select Region / Location <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={addConfigLocationId}
                  onChange={e => {
                    const locId = e.target.value;
                    setAddConfigLocationId(locId);
                    const matching = availableServersForReassign.filter(s => s.location_id === locId);
                    if (matching[0]) {
                      setAddConfigServerId(matching[0].id);
                      setAddConfigInboundId(matching[0].inbounds[0]?.inbound_id || 1);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-zinc-700"
                >
                  {Array.from(new Set(availableServersForReassign.map(s => s.location_id))).map(locId => {
                    const sample = availableServersForReassign.find(s => s.location_id === locId);
                    return (
                      <option key={locId} value={locId}>
                        {sample?.location_flag} {sample?.location_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Select Server in that region */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300 block">
                  Select Server Node <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={addConfigServerId}
                  onChange={e => {
                    const sId = e.target.value;
                    setAddConfigServerId(sId);
                    const srv = availableServersForReassign.find(s => s.id === sId);
                    if (srv?.inbounds[0]) {
                      setAddConfigInboundId(srv.inbounds[0].inbound_id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-zinc-700"
                >
                  {availableServersForReassign
                    .filter(s => s.location_id === addConfigLocationId)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.inbounds?.length || 0} inbounds)
                      </option>
                    ))}
                </select>
              </div>

              {/* Select Inbound */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-300 block">
                  Select Inbound Protocol & Port <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={addConfigInboundId}
                  onChange={e => setAddConfigInboundId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs outline-none focus:border-zinc-700 font-mono"
                >
                  {(availableServersForReassign.find(s => s.id === addConfigServerId)?.inbounds || []).map((inb: any) => (
                    <option key={inb.inbound_id} value={inb.inbound_id}>
                      #{inb.inbound_id} - {inb.tag} ({inb.protocol.toUpperCase()}:{inb.port}) {inb.domain_or_ip ? `[SNI: ${inb.domain_or_ip}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] text-zinc-400 leading-relaxed">
                Multiple configurations can be assigned to the same region. The system will keep all assigned configurations active and will not automatically delete them.
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddConfigModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddConfig || !addConfigServerId}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmittingAddConfig ? "Provisioning..." : "Add & Provision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM SUSPEND / ACTIVATE MODAL */}
      {userToToggleStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                  userToToggleStatus.is_active 
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  {userToToggleStatus.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    {userToToggleStatus.is_active ? 'Suspend Account' : 'Activate Account'}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">@{userToToggleStatus.username}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setUserToToggleStatus(null)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              {userToToggleStatus.is_active ? (
                <>
                  <p className="leading-relaxed font-semibold text-rose-300">
                    Are you sure you want to suspend @{userToToggleStatus.username}?
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Suspending will immediately disable their login access and clean up active configurations on 3X-UI server panels.
                  </p>
                </>
              ) : (
                <>
                  <p className="leading-relaxed font-semibold text-emerald-300">
                    Are you sure you want to activate @{userToToggleStatus.username}?
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Activating will restore login access and provision active VPN server configurations if they hold credit or gift balance.
                  </p>
                </>
              )}
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setUserToToggleStatus(null)}
                className="flex-1 py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isTogglingStatus}
                onClick={handleConfirmToggleStatus}
                className={cn(
                  "flex-1 py-2 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center space-x-1",
                  userToToggleStatus.is_active
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                )}
              >
                {isTogglingStatus ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <span>{userToToggleStatus.is_active ? 'Yes, Suspend' : 'Yes, Activate'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;