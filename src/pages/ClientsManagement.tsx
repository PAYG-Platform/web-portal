// src/pages/ClientsManagement.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, ChevronLeft, ChevronRight, 
  DollarSign, X, Check, Copy, QrCode, Activity, RefreshCw, 
  CheckCircle2, XCircle, PlusCircle, MinusCircle, AlertTriangle, AlertCircle, ShieldCheck, Lock,
  Eye, EyeOff
} from 'lucide-react';
import { isCommonWeakPassword } from '../utils/passwords';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import { api } from '../services/api';
import { clientService } from '../services/clientService';
import { QRCodeView } from '../components/common/QRCodeView';
import { cn } from '../components/ui/StatCard';

interface ClientType {
  id: string;
  username: string;
  email: string;
  balance: number;       // Usable balance
  frozenAmount: number;  // Amount locked in pending refund
  fullBalance: number;   // Total balance containing frozen amount (balance + frozenAmount)
  dataUsed: number;
  status: 'Active' | 'Out of Credit' | 'Suspended';
  createdDate: string;
  vlessUrl: string;
  dailyTraffic: { day: string; usage: number }[];
}

export function ClientsManagement() {
  const [clients, setClients] = useState<ClientType[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClientsCount, setTotalClientsCount] = useState(0);

  // Modals & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [activeClient, setActiveClient] = useState<ClientType | null>(null);

  // Adjustment Form State
  const [adjustAction, setAdjustAction] = useState<'Credit' | 'Debit'>('Credit');
  const [adjustAmount, setAdjustAmount] = useState<string>('50000');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Add Client Form States
  const [addFormData, setAddFormData] = useState({
    username: '',
    email: '',
    password: '',
    initialBalance: '0'
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Username & Email Availability
  const [addUsernameLoading, setAddUsernameLoading] = useState(false);
  const [addUsernameStatus, setAddUsernameStatus] = useState<'valid' | 'invalid' | null>(null);
  const [addUsernameMsg, setAddUsernameMsg] = useState('');

  const [addEmailLoading, setAddEmailLoading] = useState(false);
  const [addEmailStatus, setAddEmailStatus] = useState<'valid' | 'invalid' | null>(null);
  const [addEmailMsg, setAddEmailMsg] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Debounced Username Check
  useEffect(() => {
    if (!isAddModalOpen) return;
    const clean = addFormData.username.trim();
    if (!clean) {
      setAddUsernameLoading(false);
      setAddUsernameStatus(null);
      setAddUsernameMsg('');
      return;
    }

    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*[a-zA-Z0-9]?$/;
    if (clean.length < 3) {
      setAddUsernameLoading(false);
      setAddUsernameStatus('invalid');
      setAddUsernameMsg('Username must be at least 3 characters');
      return;
    }
    if (!usernameRegex.test(clean)) {
      setAddUsernameLoading(false);
      setAddUsernameStatus('invalid');
      setAddUsernameMsg('Must start with a letter and contain letters/numbers/underscores');
      return;
    }

    setAddUsernameStatus(null);
    setAddUsernameMsg('');

    const loadingTimer = setTimeout(() => setAddUsernameLoading(true), 200);
    const apiTimer = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean }>(`/api/iam/auth/check-username?username=${encodeURIComponent(clean)}`);
        setAddUsernameLoading(false);
        if (res.available) {
          setAddUsernameStatus('valid');
          setAddUsernameMsg('Username is available');
        } else {
          setAddUsernameStatus('invalid');
          setAddUsernameMsg('Username is already taken');
        }
      } catch {
        setAddUsernameLoading(false);
        setAddUsernameStatus('invalid');
        setAddUsernameMsg('Could not verify username availability');
      }
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(apiTimer);
    };
  }, [addFormData.username, isAddModalOpen]);

  // Debounced Email Check
  useEffect(() => {
    if (!isAddModalOpen) return;
    const clean = addFormData.email.trim();
    if (!clean) {
      setAddEmailLoading(false);
      setAddEmailStatus(null);
      setAddEmailMsg('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setAddEmailLoading(false);
      setAddEmailStatus('invalid');
      setAddEmailMsg('Invalid email format');
      return;
    }

    setAddEmailStatus(null);
    setAddEmailMsg('');

    const loadingTimer = setTimeout(() => setAddEmailLoading(true), 200);
    const apiTimer = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean }>(`/api/iam/auth/check-email?email=${encodeURIComponent(clean)}`);
        setAddEmailLoading(false);
        if (res.available) {
          setAddEmailStatus('valid');
          setAddEmailMsg('Email is available');
        } else {
          setAddEmailStatus('invalid');
          setAddEmailMsg('Email is already registered');
        }
      } catch {
        setAddEmailLoading(false);
        setAddEmailStatus('invalid');
        setAddEmailMsg('Could not verify email availability');
      }
    }, 1500);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(apiTimer);
    };
  }, [addFormData.email, isAddModalOpen]);

  const getPasswordRequirements = (pwd: string) => ({
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\\/]/.test(pwd),
    notCommon: !isCommonWeakPassword(pwd),
  });

  const addPasswordReqs = getPasswordRequirements(addFormData.password);
  const addPasswordScore = Object.values(addPasswordReqs).filter(Boolean).length;
  const isAddPasswordStrong = addPasswordScore === 6;

  // Fetch Clients and Scoped Balances for this Seller
  const fetchClients = async () => {
    setLoading(true);
    try {
      const [res, scopedBalances] = await Promise.all([
        api.get<any>(`/api/iam/connections/my-clients-paginated?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}`),
        api.get<Record<string, { balance?: number; frozen_amount?: number } | number>>('/api/billing/analytics/seller/client-balances').catch(() => ({}))
      ]);
      
      const items: ClientType[] = (res.items || []).map((u: any) => {
        const uid = String(u.id);
        const balData = scopedBalances[uid];
        const usableBalance = typeof balData === 'object' && balData !== null ? (balData.balance || 0) : (Number(balData) || 0);
        const frozenAmount = typeof balData === 'object' && balData !== null ? (balData.frozen_amount || 0) : 0;
        const fullBalance = usableBalance + frozenAmount;

        return {
          id: uid,
          username: u.username,
          email: u.email,
          balance: usableBalance,
          frozenAmount: frozenAmount,
          fullBalance: fullBalance,
          dataUsed: u.totalDataUsed || 0,
          status: (usableBalance <= 0 ? 'Out of Credit' : u.is_active ? 'Active' : 'Suspended'),
          createdDate: u.created_at ? u.created_at.split('T')[0] : 'Recently',
          vlessUrl: u.vlessUrl || `vless://${u.id}@vpn.node.com:443?encryption=none&security=reality&type=tcp#${u.username}`,
          dailyTraffic: u.dailyTraffic || [
            { day: 'Mon', usage: 1.2 },
            { day: 'Tue', usage: 1.8 },
            { day: 'Wed', usage: 1.5 },
            { day: 'Thu', usage: 2.1 },
            { day: 'Fri', usage: 2.5 },
            { day: 'Sat', usage: 3.1 },
            { day: 'Sun', usage: 2.0 }
          ]
        };
      });

      setClients(items);
      setTotalPages(res.total_pages || 1);
      setTotalClientsCount(res.total || items.length);

      if (activeClient) {
        const updatedActive = items.find((c: ClientType) => c.id === activeClient.id);
        if (updatedActive) setActiveClient(updatedActive);
      }
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, searchQuery]);

  const handleOpenAdjustModal = (client: ClientType, defaultAction: 'Credit' | 'Debit' = 'Credit') => {
    setActiveClient(client);
    setAdjustAction(defaultAction);
    setAdjustAmount('50000');
    setAdjustReason('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    const amountNum = parseFloat(adjustAmount) || 0;
    if (amountNum <= 0) {
      showToast('Amount must be greater than 0 Toman.', 'error');
      return;
    }

    if (adjustAction === 'Debit' && amountNum > activeClient.balance) {
      showToast(`Cannot decrease by ${amountNum.toLocaleString()} Toman. The client only has ${activeClient.balance.toLocaleString()} Toman usable balance remaining.`);
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await api.post<any>('/api/billing/topups/adjust', {
        client_id: activeClient.id,
        amount: amountNum,
        action: adjustAction,
        reason: adjustReason.trim() || undefined
      });

      showToast(res.message || 'Balance updated successfully!', 'success');

      const updatedBalance = res.bucket_balance !== undefined ? res.bucket_balance : (
        adjustAction === 'Credit' ? activeClient.balance + amountNum : activeClient.balance - amountNum
      );
      const updatedClient: ClientType = {
        ...activeClient,
        balance: updatedBalance,
        fullBalance: updatedBalance + activeClient.frozenAmount,
        status: updatedBalance <= 0 ? 'Out of Credit' : 'Active'
      };

      setClients(prev => prev.map(c => c.id === activeClient.id ? updatedClient : c));
      setActiveClient(updatedClient);
      setIsAdjustModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust client wallet balance.', 'error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.username || !addFormData.email || !addFormData.password) return;

    try {
      await api.post('/api/iam/users/admin/create-client', {
        username: addFormData.username.trim(),
        email: addFormData.email.trim(),
        password: addFormData.password
      });

      showToast(`Client @${addFormData.username} created successfully!`);
      setIsAddModalOpen(false);
      setAddFormData({ username: '', email: '', password: '', initialBalance: '0' });
      fetchClients();
    } catch (err: any) {
      showToast(err.message || 'Failed to create client account.', 'error');
    }
  };

  const numAmount = parseFloat(adjustAmount) || 0;
  const isAmountValid = numAmount > 0;
  const isDebitExceeding = adjustAction === 'Debit' && activeClient && numAmount > activeClient.balance;
  const projectedBalance = activeClient
    ? adjustAction === 'Credit'
      ? activeClient.balance + numAmount
      : activeClient.balance - numAmount
    : 0;

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
            <Users size={20} className="text-emerald-400" />
            <span>Clients Management</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Monitor client accounts, add or decrease wallet funds in your store (in Toman), and register new VPN users.
          </p>
        </div>
        
        <button 
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs shrink-0"
        >
          <Plus size={14} />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-3.5 bg-zinc-900/20 border border-zinc-800/50 rounded-xl flex items-start space-x-2.5 text-xs text-zinc-400">
        <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-normal">
          <strong className="text-zinc-200 font-semibold">Vendor Privacy Protection:</strong> Balances shown below are strictly scoped to the funds deposited in <strong className="text-zinc-200">your reseller store</strong>. Funds deposited with other sellers, platform crypto, or gift credits remain completely isolated and private.
        </p>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 overflow-hidden">
        
        {/* Search & Counter Bar */}
        <div className="p-3.5 border-b border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by client username or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9"
            />
          </div>

          <span className="text-xs text-zinc-500 font-mono">
            Total Connected Clients: <strong className="text-zinc-300">{totalClientsCount}</strong>
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 1. MOBILE & TABLET CARD VIEW (< lg) */}
        {/* ========================================================================= */}
        <div className="block lg:hidden p-3.5 sm:p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading clients...</div>
          ) : clients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clients.map((client) => (
                <div 
                  key={client.id}
                  onClick={() => setActiveClient(client)}
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors cursor-pointer group"
                >
                  {/* Card Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                        <Users size={14} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                          @{client.username}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono truncate">{client.email}</p>
                      </div>
                    </div>

                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0 font-mono uppercase",
                      client.status === 'Active' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      client.status === 'Out of Credit' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}>
                      {client.status}
                    </span>
                  </div>

                  {/* Card Metadata */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850/60 text-xs">
                    <div className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-850">
                      <span className="text-[9px] font-medium text-zinc-500 uppercase block">Store Balance</span>
                      <div className="flex flex-col mt-0.5">
                        {/* Total Client Balance (containing frozen amount) */}
                        <span className={cn(
                          "font-mono font-bold text-xs",
                          client.fullBalance > 0 ? "text-zinc-100" : "text-zinc-500"
                        )}>
                          {client.fullBalance.toLocaleString()} T
                        </span>

                        {/* Yellow Frozen Amount Tag */}
                        {client.frozenAmount > 0 && (
                          <span className="text-[10px] font-mono font-medium text-amber-400 flex items-center gap-0.5 mt-0.5">
                            <Lock size={9} className="shrink-0 text-amber-400" />
                            <span>({client.frozenAmount.toLocaleString()} T Frozen)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-850">
                      <span className="text-[9px] font-medium text-zinc-500 uppercase block">Registered</span>
                      <span className="font-mono text-zinc-400 text-[11px] mt-0.5 truncate block">{client.createdDate}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAdjustModal(client, 'Credit');
                      }}
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <DollarSign size={13} className="text-emerald-400" />
                      <span>Adjust Balance</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveClient(client);
                      }}
                      className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="View Details"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">
              No client records found.
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. DESKTOP TABLE VIEW (>= lg) */}
        {/* ========================================================================= */}
        <div className="hidden lg:block overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-zinc-500 font-mono">Loading clients...</div>
          ) : clients.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/60 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-950/20">
                  <th className="py-3 px-5">Client</th>
                  <th className="py-3 px-5">Balance in Your Store (Toman)</th>
                  <th className="py-3 px-5">Registered Date</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30 text-xs">
                {clients.map((client) => (
                  <tr 
                    key={client.id} 
                    onClick={() => setActiveClient(client)}
                    className="hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <Users size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-200 truncate">@{client.username}</p>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">{client.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Total Client Balance + Frozen Amount in Yellow */}
                    <td className="py-3 px-5 font-mono">
                      <div className="flex flex-col">
                        {/* 1. Full Balance containing frozen amount */}
                        <span className={cn(
                          "font-bold text-xs",
                          client.fullBalance > 0 ? "text-zinc-100" : "text-zinc-500"
                        )}>
                          {client.fullBalance.toLocaleString()} Toman
                        </span>

                        {/* 2. Yellow Frozen Amount Tag */}
                        {client.frozenAmount > 0 && (
                          <span className="text-[11px] font-mono font-medium text-amber-400 mt-0.5 flex items-center gap-1">
                            <Lock size={10} className="shrink-0 text-amber-400" />
                            <span>({client.frozenAmount.toLocaleString()} Toman Frozen)</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-5 text-zinc-400 font-mono text-[11px]">
                      {client.createdDate}
                    </td>

                    <td className="py-3 px-5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border font-mono uppercase",
                        client.status === 'Active' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        client.status === 'Out of Credit' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {client.status}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAdjustModal(client, 'Credit');
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <DollarSign size={12} className="text-emerald-400" />
                          <span>Adjust Balance</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveClient(client);
                          }}
                          className="p-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-xs text-zinc-500">
              No client records found.
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

      {/* SLIDE-OVER DRAWER FOR CLIENT DETAILS */}
      <AnimatePresence>
        {activeClient && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex justify-end">
            <div className="absolute inset-0" onClick={() => setActiveClient(null)} />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-lg h-full bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="p-5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center">
                      <Users size={15} />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 text-sm">@{activeClient.username}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono">{activeClient.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border",
                      activeClient.status === 'Active' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}>
                      {activeClient.status}
                    </span>

                    <button 
                      type="button"
                      onClick={() => setActiveClient(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Balance Adjustment Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => handleOpenAdjustModal(activeClient, 'Credit')}
                      className="flex items-center justify-center py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-emerald-400 font-semibold space-x-1.5 transition-colors cursor-pointer"
                    >
                      <PlusCircle size={14} />
                      <span>Add Funds (+)</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleOpenAdjustModal(activeClient, 'Debit')}
                      className="flex items-center justify-center py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-rose-400 font-semibold space-x-1.5 transition-colors cursor-pointer"
                    >
                      <MinusCircle size={14} />
                      <span>Deduct Funds (-)</span>
                    </button>
                  </div>

                  {/* VLESS Subscription URL Card */}
                  <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">VLESS Subscription String</span>
                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 flex items-center justify-between">
                      <p className="text-[11px] font-mono text-zinc-400 truncate max-w-[200px] select-all">{activeClient.vlessUrl}</p>
                      <div className="flex space-x-1 shrink-0 ml-2">
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeClient.vlessUrl);
                            showToast('VLESS string copied!');
                          }}
                          className="p-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded border border-zinc-800 cursor-pointer"
                          title="Copy Link"
                        >
                          <Copy size={11} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setQrModalUrl(activeClient.vlessUrl)}
                          className="p-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded border border-zinc-800 cursor-pointer"
                          title="Show QR Code"
                        >
                          <QrCode size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics with Total Store Credit and Yellow Frozen Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-3">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase block">Total Store Credit</span>
                      <div className="mt-1 flex flex-col">
                        <span className="text-base font-bold text-zinc-100 font-mono">
                          {activeClient.fullBalance.toLocaleString()} T
                        </span>
                        {activeClient.frozenAmount > 0 && (
                          <span className="text-[10px] font-mono font-medium text-amber-400 mt-0.5 flex items-center gap-0.5">
                            <Lock size={9} className="shrink-0 text-amber-400" />
                            <span>({activeClient.frozenAmount.toLocaleString()} T Frozen)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-3">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase block">Data Consumed</span>
                      <div className="mt-1 flex items-baseline space-x-1">
                        <span className="text-base font-bold text-zinc-100 font-mono">{activeClient.dataUsed.toFixed(1)}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">GB</span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Usage Chart */}
                  <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-1.5">
                        <Activity size={13} className="text-emerald-400" />
                        <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">Bandwidth Usage (7 Days)</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">GB / Day</span>
                    </div>
                    
                    <div className="h-28 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeClient.dailyTraffic} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#27272a" opacity={0.6} vertical={false} />
                          <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.5rem', fontSize: '10px' }}
                            labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                            itemStyle={{ color: '#f4f4f5' }}
                          />
                          <Bar dataKey="usage" fill="#10b981" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
                <button 
                  type="button"
                  onClick={() => setActiveClient(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADJUST WALLET BALANCE (CREDIT / DEBIT IN TOMAN) */}
      {isAdjustModalOpen && activeClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-5 space-y-4">
            
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  Adjust Balance: @{activeClient.username}
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Available in Store: <strong className="text-zinc-300">{activeClient.balance.toLocaleString()} Toman</strong>
                  {activeClient.frozenAmount > 0 && (
                    <span className="text-amber-400 ml-1">({activeClient.frozenAmount.toLocaleString()} T Frozen)</span>
                  )}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAdjustModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              
              {/* Action Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">Action</label>
                <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('Credit')}
                    className={cn(
                      "py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1",
                      adjustAction === 'Credit' ? "bg-zinc-850 text-emerald-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <PlusCircle size={13} />
                    <span>Add Funds (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustAction('Debit')}
                    className={cn(
                      "py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1",
                      adjustAction === 'Debit' ? "bg-zinc-850 text-rose-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <MinusCircle size={13} />
                    <span>Deduct (-)</span>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-zinc-400">
                    {adjustAction === 'Credit' ? 'Amount to Add (Toman)' : 'Amount to Deduct (Toman)'}
                  </label>
                  {adjustAction === 'Debit' && (
                    <button
                      type="button"
                      onClick={() => setAdjustAmount(String(activeClient.balance))}
                      className="text-[10px] font-mono text-rose-400 hover:underline"
                    >
                      Max Usable ({activeClient.balance.toLocaleString()} T)
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    step="1000"
                    required
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono font-semibold text-zinc-100 outline-none focus:border-zinc-700"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                    Toman
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {['50000', '100000', '200000', '500000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustAmount(preset)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors cursor-pointer",
                        adjustAmount === preset
                          ? "bg-zinc-800 text-zinc-100 border-zinc-750 font-semibold"
                          : "bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {parseInt(preset).toLocaleString()} T
                    </button>
                  ))}
                </div>
              </div>

              {/* Memo */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">
                  Reason / Memo (Optional)
                </label>
                <input 
                  type="text" 
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder={adjustAction === 'Credit' ? "e.g. Cash received in person" : "e.g. Manual correction"}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              {/* Projected Balance Preview */}
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500 text-[11px] font-sans">Projected Usable:</span>
                <span className="font-bold text-zinc-200">
                  {Math.max(0, projectedBalance).toLocaleString()} Toman
                </span>
              </div>

              {isDebitExceeding && (
                <p className="text-[11px] text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Cannot deduct more than available usable balance ({activeClient.balance.toLocaleString()} T).</span>
                </p>
              )}

              {/* Actions Footer */}
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting || !isAmountValid || Boolean(isDebitExceeding)}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {adjustSubmitting ? "Processing..." : "Confirm Adjustment"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CLIENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100">Add New Client</h3>
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Username</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. client_user_99"
                    value={addFormData.username}
                    onChange={e => setAddFormData({ ...addFormData, username: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {addUsernameLoading && <RefreshCw size={12} className="animate-spin text-emerald-400" />}
                    {!addUsernameLoading && addUsernameStatus === 'valid' && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {!addUsernameLoading && addUsernameStatus === 'invalid' && <XCircle size={13} className="text-rose-500" />}
                  </div>
                </div>
                {addUsernameMsg && (
                  <p className={`text-[10px] flex items-center gap-1 ${addUsernameStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {addUsernameStatus === 'valid' ? <Check size={10} /> : <X size={10} />}
                    <span>{addUsernameMsg}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    placeholder="client@example.com"
                    value={addFormData.email}
                    onChange={e => setAddFormData({ ...addFormData, email: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700 font-mono"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                    {addEmailLoading && <RefreshCw size={12} className="animate-spin text-emerald-400" />}
                    {!addEmailLoading && addEmailStatus === 'valid' && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {!addEmailLoading && addEmailStatus === 'invalid' && <XCircle size={13} className="text-rose-500" />}
                  </div>
                </div>
                {addEmailMsg && (
                  <p className={`text-[10px] flex items-center gap-1 ${addEmailStatus === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {addEmailStatus === 'valid' ? <Check size={10} /> : <X size={10} />}
                    <span>{addEmailMsg}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Temporary Password</label>
                <div className="relative">
                  <input 
                    type={showAddPassword ? "text" : "password"} 
                    required
                    placeholder="Temporary password"
                    value={addFormData.password}
                    onChange={e => setAddFormData({ ...addFormData, password: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Client will be prompted to change their password and confirm recovery keys upon first login.
              </p>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUsernameStatus !== 'valid' || addEmailStatus !== 'valid' || !isAddPasswordStrong}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setQrModalUrl(null)} 
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X size={15} />
            </button>

            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Subscription QR Code</h4>
            
            <div className="flex justify-center">
              <QRCodeView value={qrModalUrl || ''} size={160} />
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

    </div>
  );
}

export default ClientsManagement;