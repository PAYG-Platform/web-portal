// src/pages/PaymentHistories.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Download, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, 
  CheckCircle2, X, Eye, RefreshCw, 
  Activity, Plus, AlertCircle, Maximize2
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { AnimatePresence, motion } from 'motion/react';
import { api, getMediaUrl } from '../services/api';
import { cn } from '../components/ui/StatCard';

export type HistoryCategory = 'topup_requests' | 'refund_requests' | 'wallet_movements';

export interface TransactionItem {
  id: string;
  reference_id: string;
  tx_type: 'Topup' | 'Adjustment' | 'Deduction' | 'Refund' | 'Gift' | string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Approved' | 'Rejected' | string;
  payment_method?: string;
  receipt_url?: string;
  description?: string;
  seller_id?: string;
  seller_username?: string;
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

export function PaymentHistories({ initialTab }: { initialTab?: HistoryCategory }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active tab from URL or props
  const tabFromUrl = searchParams.get('tab');
  const resolvedTab: HistoryCategory = 
    initialTab ||
    (tabFromUrl === 'refunds' || tabFromUrl === 'refund_requests' ? 'refund_requests' :
     tabFromUrl === 'balance' || tabFromUrl === 'wallet_movements' ? 'wallet_movements' : 'topup_requests');

  const [activeCategory, setActiveCategory] = useState<HistoryCategory>(resolvedTab);

  // Synchronize tab state dynamically whenever URL search parameters change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'refunds' || tabParam === 'refund_requests') {
      setActiveCategory('refund_requests');
    } else if (tabParam === 'balance' || tabParam === 'wallet_movements') {
      setActiveCategory('wallet_movements');
    } else if (tabParam === 'topups' || tabParam === 'topup_requests') {
      setActiveCategory('topup_requests');
    }
  }, [searchParams]);

  // Transactions State
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Backend Filter Parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sellerQuery, setSellerQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Right-Side Inspection Drawer & Lightbox State
  const [activeTransaction, setActiveTransaction] = useState<TransactionItem | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundableInfo, setRefundableInfo] = useState<{
    available_balance: number;
    can_refund: boolean;
    refund_cooldown_days: number;
    days_until_next_refund: number;
  }>({
    available_balance: 0,
    can_refund: true,
    refund_cooldown_days: 30,
    days_until_next_refund: 0,
  });
  const [loadingRefundInfo, setLoadingRefundInfo] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync tab with URL
  const handleTabSwitch = (category: HistoryCategory) => {
    setActiveCategory(category);
    handleResetFilters();
    const tabParam = category === 'refund_requests' ? 'refunds' : category === 'wallet_movements' ? 'balance' : 'topups';
    setSearchParams({ tab: tabParam }, { replace: true });
  };

  // Fetch Data Based on Active Category & Backend Filters
  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      if (activeCategory === 'topup_requests') {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (statusFilter !== 'All') params.append('status', statusFilter);
        if (sellerQuery.trim()) params.append('seller_username', sellerQuery.trim());
        if (minAmount) params.append('min_amount', minAmount);
        if (maxAmount) params.append('max_amount', maxAmount);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const data = await api.get<TransactionItem[]>(`/api/billing/topups/my?${params.toString()}`);
        setItems(Array.isArray(data) ? data : []);

      } else if (activeCategory === 'refund_requests') {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (statusFilter !== 'All') params.append('status', statusFilter);
        if (sellerQuery.trim()) params.append('seller_username', sellerQuery.trim());
        if (minAmount) params.append('min_amount', minAmount);
        if (maxAmount) params.append('max_amount', maxAmount);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const data = await api.get<TransactionItem[]>(`/api/billing/refunds/my?${params.toString()}`);
        setItems(Array.isArray(data) ? data : []);

      } else {
        const data = await api.get<TransactionItem[]>('/api/billing/topups/wallet-movements');
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch refundable balance & cooldown eligibility for the refund modal
  const fetchRefundableBalances = async () => {
    setLoadingRefundInfo(true);
    try {
      const data = await api.get<any>('/api/billing/refunds/balances');
      if (data) {
        setRefundableInfo({
          available_balance: Number(data.available_balance) || 0,
          can_refund: data.can_refund !== false,
          refund_cooldown_days: data.refund_cooldown_days || 30,
          days_until_next_refund: data.days_until_next_refund || 0,
        });
        setRefundAmount(String(data.available_balance || ''));
      }
    } catch {
      setRefundableInfo({
        available_balance: 0,
        can_refund: false,
        refund_cooldown_days: 30,
        days_until_next_refund: 0,
      });
    } finally {
      setLoadingRefundInfo(false);
    }
  };

  useEffect(() => {
    notificationService.markBillingSeen();
  }, []);

  useEffect(() => {
    fetchCategoryData();
  }, [activeCategory, statusFilter, startDate, endDate]);

  const handleApplyBackendFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsFilterOpen(false);
    fetchCategoryData();
  };

  const handleResetFilters = () => {
    setStatusFilter('All');
    setSellerQuery('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setIsFilterOpen(false);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join('-') : '');
  };

  const handleOpenRefundModal = () => {
    setIsRefundModalOpen(true);
    setRefundAmount('');
    fetchRefundableBalances();
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!refundableInfo.can_refund) {
      showToast(
        `Refund cooldown active: 1 refund every ${refundableInfo.refund_cooldown_days} days. Next request in ${refundableInfo.days_until_next_refund} day(s).`,
        'error'
      );
      return;
    }

    const numAmount = parseFloat(refundAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid refund amount.', 'error');
      return;
    }

    if (numAmount > refundableInfo.available_balance) {
      showToast(
        `Amount exceeds refundable balance (${refundableInfo.available_balance.toLocaleString()} Toman).`,
        'error'
      );
      return;
    }

    const cleanCard = cardNumber.trim();
    // For Toman accounts: require 16-digit Shetab card. For USD accounts: accept Crypto wallet address.
    const isUsd = (searchParams.get('currency') || '').toUpperCase() === 'USD' || refundableInfo.available_balance < 100;

    if (!isUsd) {
      const numericDigits = cleanCard.replace(/\D/g, '');
      if (numericDigits.length !== 16) {
        showToast('Card number must be exactly 16 digits.', 'error');
        return;
      }
    } else if (cleanCard.length < 10) {
      showToast('Please provide a valid destination Crypto wallet address (USDT TRC20/TON).', 'error');
      return;
    }

    if (!cardholderName.trim()) {
      showToast('Cardholder / Account name is required.', 'error');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await api.post('/api/billing/refunds/request', {
        amount: numAmount,
        destination_account: isUsd ? `Crypto: ${cleanCard} (${cardholderName.trim()})` : `Shetab: ${cleanCard} (Cardholder: ${cardholderName.trim()})`,
        reason: refundReason.trim() || undefined
      });

      showToast('Refund request submitted! Track payout status below.', 'success');
      setIsRefundModalOpen(false);
      setRefundReason('');
      setCardNumber('');
      setCardholderName('');
      fetchCategoryData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit refund claim.', 'error');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = statusFilter !== 'All' || sellerQuery !== '' || minAmount !== '' || maxAmount !== '' || startDate !== '' || endDate !== '';

  const exportCSV = () => {
    const headers = "ID,Reference_ID,Type,Amount_Toman,Status,Seller,Payment_Method,Description,Created_At\n";
    const rows = items.map(t => 
      `"${t.id}","${t.reference_id}","${t.tx_type}",${t.amount},"${t.status}","${t.seller_username || ''}","${t.payment_method || ''}","${t.description || ''}","${t.created_at}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `history_${activeCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
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
            <Activity size={20} className="text-emerald-400" />
            <span>Payment & Financial History</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Audit top-up receipts, submit bank refund claims, and track your wallet balance movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleOpenRefundModal}
            className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <ArrowUpRight size={13} />
            <span>Request Refund</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/client/wallet')}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>Top-Up Wallet</span>
          </button>

          <button 
            type="button"
            onClick={exportCSV}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* 1. SEGMENTED CATEGORY TABS */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 text-xs font-medium">
        <button
          type="button"
          onClick={() => handleTabSwitch('topup_requests')}
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeCategory === 'topup_requests'
              ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <ArrowDownLeft size={14} />
          <span>Top-Ups</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('refund_requests')}
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeCategory === 'refund_requests'
              ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <ArrowUpRight size={14} />
          <span>Refunds</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('wallet_movements')}
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeCategory === 'wallet_movements'
              ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Activity size={14} />
          <span>Wallet Ledger</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 overflow-hidden">
        
        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40">
          <form onSubmit={handleApplyBackendFilters} className="relative flex-1 max-w-md flex items-center">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search reference ID or memo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9"
            />
          </form>

          <div className="flex items-center space-x-2 shrink-0">
            {activeCategory !== 'wallet_movements' && (
              <div className="relative" ref={filterRef}>
                <button 
                  type="button"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={cn(
                    "px-3 h-8 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center space-x-1.5 cursor-pointer bg-zinc-950",
                    isFilterOpen || hasActiveFilters
                      ? "border-zinc-700 text-zinc-200"
                      : "border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <SlidersHorizontal size={12} />
                  <span>Filters</span>
                  {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>

                {/* Filter Popover */}
                {isFilterOpen && (
                  <form 
                    onSubmit={handleApplyBackendFilters}
                    className="absolute right-0 top-10 w-72 bg-[#09090b] border border-zinc-800 rounded-2xl p-4 shadow-2xl z-30 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">Filter Criteria</span>
                      <button 
                        type="button" 
                        onClick={handleResetFilters}
                        className="text-[10px] text-emerald-400 hover:underline font-mono cursor-pointer"
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Status</label>
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Amount Range (Toman)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="number"
                          min="0"
                          placeholder="Min"
                          value={minAmount}
                          onChange={e => setMinAmount(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none font-mono text-[11px]"
                        />
                        <input 
                          type="number"
                          min="0"
                          placeholder="Max"
                          value={maxAmount}
                          onChange={e => setMaxAmount(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Date Duration</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none font-mono text-[10px]"
                        />
                        <input 
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none font-mono text-[10px]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg transition-colors mt-1 cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. TABLET & MOBILE VIEW: RESPONSIVE CARDS (< lg) */}
        <div className="block lg:hidden p-3.5 sm:p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading data...</div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div 
                    key={tx.id}
                    onClick={() => setActiveTransaction(tx)}
                    className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 font-mono block uppercase">Ref ID</span>
                        <p className="font-mono text-xs font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                          {tx.reference_id}
                        </p>
                      </div>

                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0 font-mono uppercase",
                        tx.status === 'Completed' || tx.status === 'Approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        tx.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {tx.status}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <p className="text-[10px] text-zinc-500">
                        {tx.payment_method || 'Platform Deposit'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between font-mono text-xs">
                      <span className="text-zinc-500 text-[10px]">{new Date(tx.created_at).toLocaleDateString()}</span>
                      <span className={cn("font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
                        {isPositive ? '+' : ''}{(tx.amount || 0).toLocaleString()} T
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">
              No records found under this category.
            </div>
          )}
        </div>

        {/* 3. DESKTOP VIEW: DATA TABLE (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-zinc-500 font-mono">Loading records...</div>
          ) : items.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/60 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-950/20">
                  <th className="py-3 px-5">Reference ID</th>
                  <th className="py-3 px-5">Channel</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Amount (Toman)</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30 text-xs">
                {items.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr 
                      key={tx.id}
                      onClick={() => setActiveTransaction(tx)}
                      className="hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-5 font-mono font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                        {tx.reference_id}
                      </td>
                      <td className="py-3 px-5 text-zinc-300">
                        {tx.payment_method || 'Platform System'}
                      </td>
                      <td className="py-3 px-5 text-zinc-400 font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-5 font-mono font-bold">
                        <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                          {isPositive ? '+' : ''}{(tx.amount || 0).toLocaleString()} T
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border font-mono uppercase",
                          tx.status === 'Completed' || tx.status === 'Approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          tx.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                          "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTransaction(tx);
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-xs text-zinc-500">
              No transactions recorded under this category.
            </div>
          )}
        </div>

      </div>

      {/* 4. DYNAMIC REFUND MODAL */}
      <AnimatePresence>
        {isRefundModalOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="absolute inset-0" onClick={() => setIsRefundModalOpen(false)} />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-zinc-100">Submit Bank Refund Request</h3>
                  <p className="text-xs text-zinc-400">
                    Withdraw unused Shetab deposit balance back to your card (1 refund every {refundableInfo.refund_cooldown_days} days).
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitRefund} className="p-5 space-y-4 text-xs">
                
                {/* Available Refundable Balance Banner */}
                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                      Refundable Deposit Balance
                    </span>
                    <span className="text-sm font-bold font-mono text-zinc-100">
                      {loadingRefundInfo ? '—' : `${refundableInfo.available_balance.toLocaleString()} Toman`}
                    </span>
                  </div>

                  {!refundableInfo.can_refund && (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      Cooldown: {refundableInfo.days_until_next_refund}d left
                    </span>
                  )}
                </div>

                {/* Refund Amount Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <label className="font-medium text-zinc-400">
                      Amount to Withdraw (Toman) <span className="text-rose-400">*</span>
                    </label>
                    {refundableInfo.available_balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setRefundAmount(String(refundableInfo.available_balance))}
                        className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                      >
                        Max ({refundableInfo.available_balance.toLocaleString()} T)
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input 
                      type="number"
                      min="0"
                      max={refundableInfo.available_balance > 0 ? refundableInfo.available_balance : undefined}
                      step="1000"
                      required
                      placeholder="0"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 font-mono font-semibold outline-none focus:border-zinc-700"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                      Toman
                    </span>
                  </div>
                </div>

                {/* Destination Shetab Card Number */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 block">
                    Destination Shetab Card <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="6037-xxxx-xxxx-xxxx"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 font-mono outline-none focus:border-zinc-700 font-medium tracking-wider"
                  />
                </div>

                {/* Cardholder Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 block">
                    Cardholder Name (As on Card) <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Ali Rezaei"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700"
                  />
                </div>

                {/* Reason Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400 block">
                    Reason / Memo (Optional)
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Unconsumed deposit balance"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsRefundModalOpen(false)}
                    className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmittingRefund || 
                      !refundableInfo.can_refund || 
                      refundableInfo.available_balance <= 0 || 
                      parseFloat(refundAmount) <= 0
                    }
                    className="flex-1 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                  >
                    {isSubmittingRefund ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <span>Submit Claim</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. RIGHT-SIDE SLIDE-OVER DRAWER (DETAILS & PROOF SCREENSHOT) */}
      <AnimatePresence>
        {activeTransaction && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-xs flex justify-end">
            <div className="absolute inset-0" onClick={() => setActiveTransaction(null)} />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-full bg-[#09090b] border-l border-zinc-800 shadow-2xl flex flex-col justify-between z-10 overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="p-5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {activeTransaction.tx_type} Audit
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono">
                      {activeTransaction.reference_id}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border font-mono uppercase",
                      activeTransaction.status === 'Completed' || activeTransaction.status === 'Approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      activeTransaction.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}>
                      {activeTransaction.status}
                    </span>

                    <button 
                      type="button"
                      onClick={() => setActiveTransaction(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Status Banner */}
                  <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
                      Transaction Amount
                    </span>
                    <h2 className={cn(
                      "text-2xl font-bold font-mono",
                      activeTransaction.amount > 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {activeTransaction.amount > 0 ? '+' : ''}{(activeTransaction.amount || 0).toLocaleString()} <span className="text-xs font-normal text-zinc-400">Toman</span>
                    </h2>
                    <p className="text-xs text-zinc-400 font-medium">
                      {activeTransaction.payment_method}
                    </p>
                  </div>

                  {/* Verification Screenshot View */}
                  {activeTransaction.receipt_url && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                          Receipt Verification Screenshot
                        </label>
                        <button 
                          type="button"
                          onClick={() => setLightboxUrl(activeTransaction.receipt_url || null)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 size={11} />
                          <span>Zoom</span>
                        </button>
                      </div>

                      <div 
                        onClick={() => setLightboxUrl(activeTransaction.receipt_url || null)}
                        className="relative h-44 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden cursor-pointer group flex items-center justify-center"
                      >
                        <img 
                          src={getMediaUrl(activeTransaction.receipt_url)} 
                          alt="Receipt Preview" 
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-zinc-200 text-xs font-medium">
                          <Eye size={14} className="mr-1" />
                          <span>Enlarge</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata Fields */}
                  <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/40 text-xs">
                    <div className="p-2.5 flex justify-between items-center">
                      <span className="text-zinc-500">Ref Code</span>
                      <span className="text-zinc-200 font-mono font-medium">{activeTransaction.reference_id}</span>
                    </div>

                    <div className="p-2.5 flex justify-between items-center">
                      <span className="text-zinc-500">Channel</span>
                      <span className="text-zinc-200">
                        {activeTransaction.payment_method || 'Platform System'}
                      </span>
                    </div>

                    <div className="p-2.5 flex justify-between items-center">
                      <span className="text-zinc-500">Submitted</span>
                      <span className="text-zinc-300 font-mono text-[11px]">{new Date(activeTransaction.created_at).toLocaleString()}</span>
                    </div>

                    {activeTransaction.processed_at && (
                      <div className="p-2.5 flex justify-between items-center">
                        <span className="text-zinc-500">Resolved Date</span>
                        <span className="text-zinc-300 font-mono text-[11px]">{new Date(activeTransaction.processed_at).toLocaleString()}</span>
                      </div>
                    )}

                    {activeTransaction.description && (
                      <div className="p-2.5 space-y-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase block">Your Note</span>
                        <p className="text-zinc-300 font-normal">{activeTransaction.description}</p>
                      </div>
                    )}

                    {activeTransaction.admin_notes && (
                      <div className="p-2.5 space-y-0.5 bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-500 uppercase block">Feedback</span>
                        <p className="text-zinc-300 font-normal italic">{activeTransaction.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
                <button 
                  type="button"
                  onClick={() => setActiveTransaction(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox Zoom Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-full cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="max-w-3xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <img 
              src={getMediaUrl(lightboxUrl)} 
              alt="Receipt Fullscreen" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" 
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default PaymentHistories;