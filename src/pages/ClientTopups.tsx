// src/pages/ClientTopups.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Receipt, Check, X, Search, 
  SlidersHorizontal, ChevronRight, Maximize2, 
  CheckCircle2, AlertCircle, XCircle, RefreshCw, 
  Eye, Clock, User, ArrowDownLeft, ArrowUpRight, 
  Activity, Download, Upload, AlertTriangle, Landmark
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../components/ui/StatCard';
import { api, getMediaUrl } from '../services/api';

export type AdminOpsCategory = 'topup_requests' | 'refund_requests' | 'wallet_movements';

export interface TransactionItem {
  id: string;
  reference_id: string;
  user_id: string;
  client_username?: string;
  client_email?: string;
  tx_type: 'Topup' | 'Adjustment' | 'Deduction' | 'Refund' | 'Gift' | string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | string;
  payment_method?: string;
  receipt_url?: string;
  description?: string;
  admin_notes?: string;
  reservation_status?: string;
  location_id?: string;
  created_at: string;
  processed_at?: string;
}

export function ClientTopups() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const initialCategory: AdminOpsCategory = 
    tabFromUrl === 'refunds' || tabFromUrl === 'refund_requests' ? 'refund_requests' :
    tabFromUrl === 'ledger' || tabFromUrl === 'wallet_movements' ? 'wallet_movements' : 'topup_requests';

  const [activeCategory, setActiveCategory] = useState<AdminOpsCategory>(initialCategory);

  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingTopupStats, setPendingTopupStats] = useState({ count: 0, totalAmount: 0 });
  const [pendingRefundStats, setPendingRefundStats] = useState({ count: 0, totalAmount: 0 });

  const fetchSummaryStats = async () => {
    try {
      const [topupsRes, refundsRes] = await Promise.all([
        api.get<any[]>('/api/billing/topups/pending').catch(() => []),
        api.get<any[]>('/api/billing/refunds/pending').catch(() => [])
      ]);

      const topupList = Array.isArray(topupsRes) ? topupsRes : [];
      const refundList = Array.isArray(refundsRes) ? refundsRes : [];

      setPendingTopupStats({
        count: topupList.length,
        totalAmount: topupList.reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0)
      });

      setPendingRefundStats({
        count: refundList.length,
        totalAmount: refundList.reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0)
      });
    } catch {
      // Handled silently
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeTransaction, setActiveTransaction] = useState<TransactionItem | null>(null);

  const [creditAmountInput, setCreditAmountInput] = useState<string>('');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  
  const [refundTxRefInput, setRefundTxRefInput] = useState('');
  const [refundProofBase64, setRefundProofBase64] = useState('');
  const [refundProofFileName, setRefundProofFileName] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const refundFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTabSwitch = (cat: AdminOpsCategory) => {
    setActiveCategory(cat);
    setStatusFilter('All');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    const tabParam = cat === 'refund_requests' ? 'refunds' : cat === 'wallet_movements' ? 'ledger' : 'topups';
    setSearchParams({ tab: tabParam }, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'refunds' || tabParam === 'refund_requests') {
      setActiveCategory('refund_requests');
    } else if (tabParam === 'ledger' || tabParam === 'wallet_movements') {
      setActiveCategory('wallet_movements');
    } else if (tabParam === 'topups' || tabParam === 'topup_requests') {
      setActiveCategory('topup_requests');
    }
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      let rawData: any[] = [];

      if (activeCategory === 'topup_requests') {
        const res = await api.get<any[]>(`/api/billing/topups/admin/all?${params.toString()}`);
        rawData = Array.isArray(res) ? res : [];
      } else if (activeCategory === 'refund_requests') {
        const res = await api.get<any[]>(`/api/billing/refunds/admin/all?${params.toString()}`);
        rawData = Array.isArray(res) ? res : [];
      } else {
        const [topupsRes, refundsRes] = await Promise.all([
          api.get<any[]>(`/api/billing/topups/admin/all?${params.toString()}`).catch(() => []),
          api.get<any[]>(`/api/billing/refunds/admin/all?${params.toString()}`).catch(() => [])
        ]);

        const combined = [
          ...(Array.isArray(topupsRes) ? topupsRes : []),
          ...(Array.isArray(refundsRes) ? refundsRes : [])
        ].filter(tx => tx.status === 'Completed' || tx.status === 'Approved');

        rawData = combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const formatted: TransactionItem[] = rawData.map(tx => ({
        id: String(tx.id),
        reference_id: tx.reference_id || `TXN-${String(tx.id).slice(0, 8)}`,
        user_id: String(tx.user_id),
        client_username: tx.client_username || `client_${String(tx.user_id).slice(0, 6)}`,
        client_email: tx.client_email,
        tx_type: tx.tx_type || (activeCategory === 'refund_requests' ? 'Refund' : 'Topup'),
        amount: Math.abs(Number(tx.amount) || 0),
        currency: (tx.currency || (tx.payment_method?.includes('USD') ? 'USD' : 'IRT')).toUpperCase(),
        status: tx.status || 'Pending',
        payment_method: tx.payment_method || (activeCategory === 'refund_requests' ? 'Shetab Card Refund' : 'Bank Card Transfer'),
        receipt_url: tx.receipt_url || undefined,
        description: tx.description || undefined,
        admin_notes: tx.admin_notes || undefined,
        reservation_status: tx.reservation_status || undefined,
        location_id: tx.location_id || undefined,
        created_at: tx.created_at || new Date().toISOString(),
        processed_at: tx.processed_at || undefined
      }));

      setItems(formatted);

      if (activeTransaction) {
        const updatedActive = formatted.find(i => i.id === activeTransaction.id);
        if (updatedActive) setActiveTransaction(updatedActive);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSummaryStats();
  }, [activeCategory, statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenDrawer = (item: TransactionItem) => {
    setActiveTransaction(item);
    setCreditAmountInput(String(item.amount));
    setAdminNoteInput(item.admin_notes || '');
    setRefundTxRefInput('');
    setRefundProofBase64('');
    setRefundProofFileName('');

    if (item.status.toLowerCase() === 'pending') {
      const checkedIds: string[] = JSON.parse(localStorage.getItem('admin_checked_pending_ids') || '[]');
      if (!checkedIds.includes(item.id)) {
        checkedIds.push(item.id);
        localStorage.setItem('admin_checked_pending_ids', JSON.stringify(checkedIds));
      }
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedField(fieldId);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- TOP-UP ACTIONS ---
  const handleApproveTopup = async (item: TransactionItem) => {
    const finalAmount = parseFloat(creditAmountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      showToast('Please enter a valid credit amount in Toman.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/api/billing/topups/${item.id}/process`, {
        action: 'Approve',
        amount_credited: finalAmount,
        notes: adminNoteInput.trim() || 'Approved by Admin'
      });

      showToast(`Approved! ${finalAmount.toLocaleString()} Toman credited to @${item.client_username}`, 'success');
      fetchData();
      fetchSummaryStats();
    } catch (err: any) {
      if (err.data?.detail === 'CAPACITY_FULL_NEEDS_UNALLOCATED' || err.message?.includes('CAPACITY_FULL_NEEDS_UNALLOCATED')) {
        showToast('Region servers are completely full! Please click "Approve as Flexible Credit" below or Reject.', 'error');
      } else {
        showToast(err.message || 'Failed to approve top-up request.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveUnallocatedTopup = async (item: TransactionItem) => {
    const finalAmount = parseFloat(creditAmountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      showToast('Please enter a valid credit amount in Toman.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/api/billing/topups/${item.id}/process`, {
        action: 'ApproveUnallocated',
        amount_credited: finalAmount,
        notes: adminNoteInput.trim() || 'Approved as flexible credit (region full)'
      });

      showToast(`Approved as Flexible Store Credit! ${finalAmount.toLocaleString()} Toman credited to @${item.client_username}`, 'success');
      fetchData();
      fetchSummaryStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve flexible credit.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectTopup = async (item: TransactionItem) => {
    setIsProcessing(true);
    try {
      await api.post(`/api/billing/topups/${item.id}/process`, {
        action: 'Reject',
        notes: adminNoteInput.trim() || 'Top-up request is not valid'
      });

      showToast(`Rejected top-up request from @${item.client_username}.`, 'success');
      fetchData();
      fetchSummaryStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject top-up request.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- REFUND ACTIONS ---
  const handleApproveRefund = async (item: TransactionItem) => {
    // Front-end requirement validation for Receipt Image
    if (!refundProofBase64) {
      showToast('Please upload a payout receipt screenshot to approve the refund.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/api/billing/refunds/${item.id}/process`, {
        action: 'Approve',
        tx_hash_or_ref: refundTxRefInput.trim() || undefined,
        proof_receipt_url: refundProofBase64,
        notes: adminNoteInput.trim() || 'Refund payout completed'
      });

      showToast(`Refund of ${item.amount.toLocaleString()} Toman approved and logged!`, 'success');
      fetchData();
      fetchSummaryStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to process refund approval.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRefund = async (item: TransactionItem) => {
    setIsProcessing(true);
    try {
      await api.post(`/api/billing/refunds/${item.id}/process`, {
        action: 'Reject',
        notes: adminNoteInput.trim() || 'Refund request is not valid'
      });

      showToast(`Refund request rejected. Locked funds returned to @${item.client_username}'s wallet.`, 'success');
      fetchData();
      fetchSummaryStats();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject refund request.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Note Update on already processed transactions
  const handleUpdateNoteOnly = async (item: TransactionItem) => {
    setIsProcessing(true);
    try {
      if (item.tx_type === 'Refund') {
        // Now calling the correct dedicated PATCH endpoint for Refunds
        await api.patch(`/api/billing/refunds/${item.id}/note`, {
          notes: adminNoteInput.trim()
        });
      } else {
        await api.patch(`/api/billing/topups/${item.id}/note`, {
          notes: adminNoteInput.trim()
        });
      }
      showToast('Note updated successfully!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update note.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fast Client-Side text search fallback on currently loaded items
  const filteredItems = items.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (req.client_username || '').toLowerCase().includes(q) ||
      (req.reference_id || '').toLowerCase().includes(q) ||
      (req.description || '').toLowerCase().includes(q) ||
      (req.payment_method || '').toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const headers = "ID,Reference_ID,Type,Amount_Toman,Status,Client,Payment_Method,Description,Created_At\n";
    const rows = filteredItems.map(t => 
      `"${t.id}","${t.reference_id}","${t.tx_type}",${t.amount},"${t.status}","${t.client_username || ''}","${t.payment_method || ''}","${t.description || ''}","${t.created_at}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `admin_${activeCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };

  // Drag & drop file processing for refund receipts
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.includes('pdf')) {
      showToast('Please upload an image screenshot or PDF.', 'error');
      return;
    }
    setRefundProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => setRefundProofBase64(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full space-y-5 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in",
          toastMessage.type === 'success' ? "bg-zinc-950 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-rose-500/30 text-rose-400"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Receipt size={20} className="text-emerald-400" />
            <span>Client Financial Operations</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Review incoming top-up receipts, process client bank refund claims, and audit wallet adjustments.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={() => {
              fetchData();
              fetchSummaryStats();
            }}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin text-emerald-400")} />
          </button>

          <button 
            onClick={exportCSV}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Minimal Top Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Pending Top-Up Requests */}
        <div 
          onClick={() => handleTabSwitch('topup_requests')}
          className={cn(
            "rounded-2xl bg-zinc-900/30 border p-4 flex items-center justify-between cursor-pointer transition-colors hover:border-zinc-700",
            activeCategory === 'topup_requests' ? "border-emerald-500/30" : "border-zinc-800/60"
          )}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Pending Top-Up Requests
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold font-mono text-zinc-100">
                {pendingTopupStats.count}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                ({pendingTopupStats.totalAmount.toLocaleString()} Toman)
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl shrink-0">
            <Clock size={16} />
          </div>
        </div>

        {/* Card 2: Pending Refund Requests */}
        <div 
          onClick={() => handleTabSwitch('refund_requests')}
          className={cn(
            "rounded-2xl bg-zinc-900/30 border p-4 flex items-center justify-between cursor-pointer transition-colors hover:border-zinc-700",
            activeCategory === 'refund_requests' ? "border-rose-500/30" : "border-zinc-800/60"
          )}
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Pending Refund Requests
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold font-mono text-zinc-100">
                {pendingRefundStats.count}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                ({pendingRefundStats.totalAmount.toLocaleString()} Toman)
              </span>
            </div>
          </div>
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl shrink-0">
            <ArrowUpRight size={16} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SEGMENTED CATEGORY TABS */}
      {/* ========================================================================= */}
      <div className="w-full grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 text-xs font-medium">
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
          {pendingTopupStats.count > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-400 font-mono font-semibold">
              {pendingTopupStats.count}
            </span>
          )}
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
          {pendingRefundStats.count > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/15 text-rose-400 font-mono font-semibold">
              {pendingRefundStats.count}
            </span>
          )}
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
      <div className="w-full rounded-2xl bg-zinc-900/30 border border-zinc-800/60 overflow-hidden">
        
        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by client, reference ID, or memo... (Press Enter)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors h-9"
            />
          </form>

          <div className="flex items-center space-x-2">
            {/* Status Filter Pills */}
            <div className="flex bg-zinc-950 p-0.5 border border-zinc-800/60 rounded-lg text-[11px] font-medium">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                    statusFilter === st 
                      ? "bg-zinc-850 text-zinc-100 font-semibold" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "px-2.5 h-8 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center space-x-1 cursor-pointer bg-zinc-950",
                showFilters || startDate !== '' || endDate !== ''
                  ? "border-zinc-700 text-zinc-200"
                  : "border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">Dates</span>
            </button>
          </div>
        </div>

        {/* Collapsible Date Filters Drawer */}
        {showFilters && (
          <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in slide-in-from-top duration-150">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Start Date</label>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">End Date</label>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TABLET & MOBILE VIEW: RESPONSIVE CARDS (< lg) */}
        {/* ========================================================================= */}
        <div className="block lg:hidden p-3.5 sm:p-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading operations data...</div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((req) => (
                <div 
                  key={req.id}
                  onClick={() => handleOpenDrawer(req)}
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                        <User size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-200 block truncate">
                          @{req.client_username}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono block truncate">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0 font-mono uppercase",
                      req.status === 'Approved' || req.status === 'Completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      req.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    )}>
                      {req.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider block">
                        {req.tx_type === 'Refund' ? 'Refund' : 'Amount'}
                      </span>
                      <span className={cn(
                        "font-mono text-xs font-bold",
                        req.tx_type === 'Refund' ? "text-rose-400" : "text-emerald-400"
                      )}>
                        {req.amount.toLocaleString()} T
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer(req);
                      }}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1"
                    >
                      <span>{req.status === 'Pending' ? 'Review' : 'Audit'}</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">No records found.</div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. DESKTOP FULL-SCREEN TABLE VIEW (>= lg) */}
        {/* ========================================================================= */}
        <div className="hidden lg:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/60 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-950/20">
                <th className="py-3 px-5">Client</th>
                <th className="py-3 px-5">Operation</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Amount (Toman)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-zinc-500 font-mono">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw size={14} className="animate-spin text-zinc-400" />
                      <span>Loading operations data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((req) => (
                  <tr 
                    key={req.id}
                    onClick={() => handleOpenDrawer(req)}
                    className="hover:bg-zinc-900/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <User size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-200 truncate">@{req.client_username}</p>
                          <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[130px]">{req.client_email || req.payment_method}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-5 font-medium text-zinc-300">
                      {req.tx_type}
                    </td>

                    <td className="py-3 px-5 text-zinc-400 font-mono text-[11px]">
                      {new Date(req.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-5 font-mono font-bold">
                      <span className={req.tx_type === 'Refund' ? 'text-rose-400' : 'text-emerald-400'}>
                        {(req as any).currency === 'USD' ? `$${req.amount.toFixed(2)}` : `${req.amount.toLocaleString()} T`}
                      </span>
                    </td>

                    <td className="py-3 px-5">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border font-mono uppercase",
                        req.status === 'Approved' || req.status === 'Completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        req.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {req.status}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDrawer(req);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center space-x-1",
                          req.status === 'Pending'
                            ? "bg-zinc-100 hover:bg-white text-zinc-950"
                            : "bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300"
                        )}
                      >
                        <span>{req.status === 'Pending' ? 'Review' : 'Audit'}</span>
                        <ChevronRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-zinc-500">
                    No operations recorded under this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. MINIMAL SLIDE-OVER REVIEW DRAWER */}
      {/* ========================================================================= */}
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
                    <h3 className="text-sm font-bold text-zinc-100">
                      @{activeTransaction.client_username}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border font-mono uppercase",
                      activeTransaction.status === 'Approved' || activeTransaction.status === 'Completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
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

                {/* Content */}
                <div className="p-5 space-y-4 text-xs">
                  
                  {/* Amount Summary (Adapts $ vs Toman) */}
                  <div className="p-3.5 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
                      {activeTransaction.tx_type === 'Refund' ? 'Requested Refund' : 'Top-Up Amount'}
                    </span>
                    <h2 className={cn(
                      "text-2xl font-bold font-mono",
                      activeTransaction.tx_type === 'Refund' ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {(activeTransaction as any).currency === 'USD'
                        ? `$${activeTransaction.amount.toFixed(2)}`
                        : activeTransaction.amount.toLocaleString()} <span className="text-xs font-normal text-zinc-400">{(activeTransaction as any).currency === 'USD' ? 'USD' : 'Toman'}</span>
                    </h2>
                  </div>

                  {/* Refund Destination Shetab Card Details */}
                  {activeTransaction.tx_type === 'Refund' && (
                    <div className="p-3.5 bg-zinc-900/30 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <Landmark size={12} />
                          <span>Destination Shetab Card</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeTransaction.payment_method || '', 'card_num')}
                          className="text-[10px] text-emerald-400 hover:underline font-mono cursor-pointer"
                        >
                          {copiedField === 'card_num' ? 'Copied' : 'Copy Card'}
                        </button>
                      </div>

                      <p className="font-mono text-xs font-semibold text-zinc-200 bg-zinc-950 p-2 rounded-lg border border-zinc-850 select-all">
                        {activeTransaction.payment_method}
                      </p>
                    </div>
                  )}

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

                  {/* Metadata List */}
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

                    {/* Client Note */}
                    {activeTransaction.description && 
                     !activeTransaction.payment_method?.startsWith('Direct Transfer via') &&
                     !activeTransaction.payment_method?.startsWith('Direct Deduction by') &&
                     !activeTransaction.description.startsWith('Direct wallet top-up') &&
                     !activeTransaction.description.startsWith('Direct balance deduction') && (
                      <div className="p-2.5 space-y-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase block">Client Note</span>
                        <p className="text-zinc-300 font-normal">{activeTransaction.description}</p>
                      </div>
                    )}

                    {/* Admin Note */}
                    {activeTransaction.admin_notes && (
                      <div className="p-2.5 space-y-0.5 bg-zinc-950/40">
                        <span className="text-[10px] text-zinc-500 uppercase block">Admin Feedback</span>
                        <p className="text-zinc-300 font-normal italic">{activeTransaction.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Pending Top-up Controls */}
                  {activeTransaction.status.toLowerCase() === 'pending' && activeTransaction.tx_type === 'Topup' && (
                    <div className="space-y-3">

                      <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider block">
                            Credit Amount ({(activeTransaction as any).currency === 'USD' ? 'USD $' : 'Toman'}) <span className="text-rose-400">*</span>
                          </label>
                          <input 
                            type="number"
                            min="0"
                            step={(activeTransaction as any).currency === 'USD' ? "0.01" : "1000"}
                            value={creditAmountInput}
                            onChange={e => setCreditAmountInput(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-100 outline-none focus:border-zinc-700"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-zinc-400 block">
                            Verification Note (Optional)
                          </label>
                          <input 
                            type="text"
                            placeholder="e.g. Verified via Bank SMS"
                            value={adminNoteInput}
                            onChange={e => setAdminNoteInput(e.target.value)}
                            className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Refund Controls */}
                  {activeTransaction.status.toLowerCase() === 'pending' && activeTransaction.tx_type === 'Refund' && (
                    <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider block">
                          Bank Tracking / Reference Number
                        </label>
                        <input 
                          type="text"
                          placeholder="e.g. Shetab Ref No."
                          value={refundTxRefInput}
                          onChange={e => setRefundTxRefInput(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-700 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-zinc-400 block">
                          Upload Payout Receipt <span className="text-rose-400">*</span>
                        </label>
                        <input 
                          type="file"
                          ref={refundFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setRefundProofFileName(file.name);
                              const reader = new FileReader();
                              reader.onload = (evt) => setRefundProofBase64(evt.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => refundFileInputRef.current?.click()}
                          className={cn(
                            "w-full p-2.5 border border-dashed rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-colors",
                            refundProofBase64 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          {refundProofBase64 ? <Check size={13} /> : <Upload size={13} />}
                          <span className="truncate">{refundProofFileName || 'Select transfer receipt image'}</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-zinc-400 block">
                          Admin Feedback (Optional)
                        </label>
                        <input 
                          type="text"
                          placeholder="e.g. Transferred via Mobile Bank"
                          value={adminNoteInput}
                          onChange={e => setAdminNoteInput(e.target.value)}
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-700"
                        />
                      </div>
                    </div>
                  )}

                  {/* Note update for processed requests */}
                  {activeTransaction.status.toLowerCase() !== 'pending' && (
                    <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                          Update Note for Client
                        </label>
                        <span className="text-[10px] text-zinc-500">Visible to client</span>
                      </div>
                      <textarea 
                        rows={2}
                        placeholder="Add or adjust note..."
                        value={adminNoteInput}
                        onChange={e => setAdminNoteInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 outline-none focus:border-zinc-700 resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleUpdateNoteOnly(activeTransaction)}
                          className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
                {activeTransaction.status.toLowerCase() === 'pending' ? (
                  activeTransaction.tx_type === 'Refund' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRejectRefund(activeTransaction)}
                        className="py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-rose-400 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>

                      <button 
                        type="button"
                        disabled={isProcessing || !refundProofBase64}
                        onClick={() => handleApproveRefund(activeTransaction)}
                        className="py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        {isProcessing ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Confirm Payout</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRejectTopup(activeTransaction)}
                          className="py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-rose-400 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <X size={14} />
                          <span>Reject</span>
                        </button>

                        <button 
                          type="button"
                          disabled={isProcessing || parseFloat(creditAmountInput) <= 0}
                          onClick={() => handleApproveTopup(activeTransaction)}
                          className="py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          {isProcessing ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Approve & Credit</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <button 
                    type="button"
                    onClick={() => setActiveTransaction(null)}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    Close Details
                  </button>
                )}
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

export default ClientTopups;