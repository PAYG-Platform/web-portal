// vpn-payg-frontend/src/pages/ClientTopupWallet.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Upload, Copy, Check, 
  ShieldCheck, RefreshCw, Trash2, CheckCircle2, 
  ArrowRight, Coins, CreditCard,
  AlertCircle, Globe, FileText
} from 'lucide-react';
import { api } from '../services/api';
import { BankCardItem, CryptoWalletItem } from '../services/authService';
import { cn } from '../components/ui/StatCard';

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

export function ClientTopupWallet() {
  const navigate = useNavigate();

  // Platform Admin Financial Details
  const [adminBankCards, setAdminBankCards] = useState<BankCardItem[]>([]);
  const [adminCryptoWallets, setAdminCryptoWallets] = useState<CryptoWalletItem[]>([]);
  const [adminInstructions, setAdminInstructions] = useState<string>('');
  const [loadingPlatform, setLoadingPlatform] = useState<boolean>(true);
  const [accountCurrency, setAccountCurrency] = useState<'IRT' | 'USD'>('IRT');
  // Channel selector: USD accounts are permanently locked into 'crypto'
  const [paymentMethodType, setPaymentMethodType] = useState<'shetab' | 'crypto'>('shetab');

  // Dynamic Minimum Threshold
  const [minRequired, setMinRequired] = useState<number>(50000);

  // Form Inputs State
  const [depositAmount, setDepositAmount] = useState<string>('50000');
  const [txnRef, setTxnRef] = useState<string>('');
  const [userMemo, setUserMemo] = useState<string>('');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Copy Feedback & Toast
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPlatformFinancials = async () => {
    setLoadingPlatform(true);
    try {
      const [res, balRes] = await Promise.all([
        api.get<any>('/api/billing/settings/admin-financials'),
        api.get<any>('/api/billing/topups/balance').catch(() => null)
      ]);
      if (res) {
        const detectedCurr = String(balRes?.currency || 'IRT').toUpperCase() as 'IRT' | 'USD';
        setAccountCurrency(detectedCurr);

        // International USD accounts are locked into Crypto mode
        if (detectedCurr === 'USD') {
          setPaymentMethodType('crypto');
          setAdminBankCards([]);
        } else {
          setAdminBankCards(res.admin_bank_cards || []);
        }

        setAdminCryptoWallets(res.admin_crypto_wallets || []);
        setAdminInstructions(res.admin_payment_instructions || '');

        const userSpecificMin = balRes?.user_min_topup_amount;
        const defaultMin = detectedCurr === 'USD' ? (res.new_region_min_topup_amount_usd || 2.0) : (res.new_region_min_topup_amount || 50000);
        const minVal = userSpecificMin !== undefined ? userSpecificMin : defaultMin;
        setMinRequired(minVal);
        setDepositAmount(String(minVal));
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingPlatform(false);
    }
  };

  useEffect(() => {
    fetchPlatformFinancials();
  }, []);

  const handleCopy = (text: string, id: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    setCopiedId(id);
    showToast(label, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
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
      showToast('Please upload an image screenshot or PDF of your payment receipt.', 'error');
      return;
    }
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setReceiptBase64(result);
      setReceiptPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReceiptFileName('');
    setReceiptBase64('');
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountVal = parseFloat(depositAmount);
    const isUsd = accountCurrency === 'USD';
    const isCrypto = isUsd || paymentMethodType === 'crypto';

    if (isNaN(amountVal) || amountVal < minRequired) {
      showToast(
        isUsd
          ? `Minimum deposit amount is $${minRequired.toFixed(2)} USD.`
          : `Minimum top-up amount is ${minRequired.toLocaleString()} Toman.`,
        'error'
      );
      return;
    }

    if (!receiptBase64) {
      showToast('Please attach your transfer receipt screenshot.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Dynamic Endpoint: Routes to /crypto for USD accounts and crypto deposits; /fiat for Shetab card transfers
      const endpoint = isCrypto ? '/api/billing/topups/crypto' : '/api/billing/topups/fiat';
      const channelLabel = isCrypto
        ? (isUsd ? 'Crypto (USDT / TON)' : 'Crypto USDT Deposit (Converted to Toman)')
        : 'Shetab Bank Card';

      const payload = {
        amount: amountVal,
        reference_id: txnRef.trim() || undefined,
        receipt_url: receiptBase64,
        payment_method: channelLabel,
        description: userMemo.trim() || undefined
      };

      await api.post(endpoint, payload);

      showToast('Receipt submitted! Admin will verify and credit your wallet.', 'success');
      setTxnRef('');
      setUserMemo('');
      setReceiptFileName('');
      setReceiptBase64('');
      setReceiptPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showToast(err.message || 'Failed to submit top-up request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPlatformAccounts = adminCryptoWallets.length > 0 || adminBankCards.length > 0;
  const numericAmount = parseFloat(depositAmount) || 0;

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Wallet size={20} className="text-emerald-400" />
            <span>Top-Up Wallet</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Deposit to the official platform accounts to recharge your global balance.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/client/history')}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Histories</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2-Column Checkout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Official Deposit Accounts */}
        <div className="lg:col-span-7 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 p-4 sm:p-5 space-y-4">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">
                  01
                </span>
                <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} className="text-emerald-400" />
                  <span>
                    {accountCurrency === 'USD' 
                      ? 'Official Crypto Deposit Accounts (USDT / TON)' 
                      : 'Official Platform Deposit Accounts'}
                  </span>
                </span>
              </div>

              {/* Status Tag for USD Accounts */}
              {accountCurrency === 'USD' && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <span>🔒 Crypto Only (USD)</span>
                </span>
              )}
            </div>

            {/* IRT Channel Switcher (Shetab vs Crypto) */}
            {accountCurrency === 'IRT' && (
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 border border-zinc-850 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('shetab')}
                  className={cn(
                    "py-2 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5",
                    paymentMethodType === 'shetab'
                      ? "bg-zinc-850 text-emerald-400 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <CreditCard size={13} />
                  <span>کارت به کارت شتاب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethodType('crypto')}
                  className={cn(
                    "py-2 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1.5",
                    paymentMethodType === 'crypto'
                      ? "bg-zinc-850 text-emerald-400 font-bold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Coins size={13} />
                  <span>ارز دیجیتال (USDT / TON)</span>
                </button>
              </div>
            )}

            <p className="text-xs text-zinc-400">
              {accountCurrency === 'USD'
                ? 'Transfer USDT (TRC20) or TON to the official platform wallet addresses below:'
                : paymentMethodType === 'shetab'
                  ? 'مبلغ را به یکی از شماره کارت‌های شتاب زیر واریز نمایید:'
                  : 'مبلغ تتر را به آدرس‌های کیف پول زیر انتقال دهید (معادل تومانی به صورت خودکار محاسبه می‌شود):'}
            </p>

            {loadingPlatform ? (
              <div className="py-8 text-center text-xs text-zinc-400 font-mono">Loading platform accounts...</div>
            ) : hasPlatformAccounts ? (
              <div className="space-y-2.5">
                {/* Shetab Cards: Shown ONLY for IRT accounts when Shetab channel is selected */}
                {accountCurrency === 'IRT' && paymentMethodType === 'shetab' && adminBankCards.map((card) => (
                  <div key={card.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <CreditCard size={14} className="text-zinc-400" />
                        <span className="font-semibold text-zinc-200">
                          {card.bank_name || 'Central Shetab Card'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-300 font-bold uppercase bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        SHETAB
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                      <p className="font-mono text-sm sm:text-base font-bold text-zinc-50 tracking-wider select-all">
                        {card.card_number}
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => handleCopy(card.card_number, card.id, 'Card number copied!')}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                      >
                        {copiedId === card.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copiedId === card.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-300 pt-0.5">
                      <span>Cardholder: <strong className="text-zinc-100 font-semibold">{card.cardholder_name}</strong></span>
                      {card.memo && <span className="font-mono text-zinc-400">Memo: {card.memo}</span>}
                    </div>
                  </div>
                ))}

                {/* Crypto Wallets */}
                {adminCryptoWallets.map((wallet, idx) => (
                  <div key={`crypto-${idx}`} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-xs uppercase text-blue-400 font-bold">
                        {wallet.network} {wallet.label ? `• ${wallet.label}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                      <p className="font-mono text-xs sm:text-sm font-semibold text-zinc-100 break-all select-all">
                        {wallet.address}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopy(wallet.address, `crypto-${idx}`, 'Address copied!')}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md text-xs font-semibold transition-colors shrink-0"
                      >
                        {copiedId === `crypto-${idx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-zinc-400 rounded-xl border border-dashed border-zinc-800">
                No deposit accounts configured yet. Please check back shortly.
              </div>
            )}

            {adminInstructions && (
              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 space-y-1">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <FileText size={13} className="text-zinc-400" />
                  <span>Payment Instructions:</span>
                </span>
                <p className="leading-relaxed font-normal text-zinc-300">{adminInstructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Submit Verification Slip */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 p-4 sm:p-5 space-y-4">
          
          <div className="space-y-1 border-b border-zinc-800/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">
                02
              </span>
              <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Submit Verification Slip
              </h3>
            </div>
            <p className="text-xs text-zinc-400 font-normal">
              Enter transferred amount and attach payment receipt screenshot.
            </p>
          </div>

          <form onSubmit={handleSubmitTopup} className="space-y-4 text-xs">

            {/* Prominent Payment Channel Confirmation Card */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                  Payment Method Type:
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border",
                  accountCurrency === 'USD' || paymentMethodType === 'crypto'
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                )}>
                  {accountCurrency === 'USD' || paymentMethodType === 'crypto' ? '🪙 Crypto (USDT/TON)' : '💳 کارت شتاب (Shetab)'}
                </span>
              </div>

              {accountCurrency === 'IRT' ? (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('shetab')}
                    className={cn(
                      "py-1.5 px-2 rounded-lg border text-center font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1",
                      paymentMethodType === 'shetab'
                        ? "bg-zinc-850 border-emerald-500/40 text-emerald-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <CreditCard size={12} />
                    <span>کارت به کارت شتاب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethodType('crypto')}
                    className={cn(
                      "py-1.5 px-2 rounded-lg border text-center font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1",
                      paymentMethodType === 'crypto'
                        ? "bg-zinc-850 border-emerald-500/40 text-emerald-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <Coins size={12} />
                    <span>ارز دیجیتال (Crypto)</span>
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-400 leading-tight">
                  🔒 Global USD accounts are locked into Crypto deposits (USDT TRC20 / TON).
                </p>
              )}
            </div>

            {/* Minimum Top-Up Info Banner */}
            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Minimum Required Deposit:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {accountCurrency === 'USD' 
                  ? `$${minRequired.toFixed(2)} USD` 
                  : `${minRequired.toLocaleString()} Toman`}
              </span>
            </div>
            
            {/* Deposit Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-zinc-200">
                  Amount ({accountCurrency === 'USD' ? 'USD $' : 'Toman'}) <span className="text-rose-400 font-bold">*</span>
                </label>
                {numericAmount > 0 && (
                  <span className="font-mono text-emerald-400 font-bold">
                    {accountCurrency === 'USD'
                      ? `$${numericAmount.toFixed(2)} USD`
                      : `${numericAmount.toLocaleString()} Toman`}
                  </span>
                )}
              </div>

              <div className="relative">
                <input 
                  type="number"
                  min={minRequired}
                  step={accountCurrency === 'USD' ? "0.5" : "1000"}
                  required
                  placeholder={String(minRequired)}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full pl-3 pr-16 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm text-zinc-50 font-mono font-bold outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold pointer-events-none">
                  {accountCurrency === 'USD' ? 'USD' : 'Toman'}
                </span>
              </div>

              {/* Amount Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {(accountCurrency === 'USD' ? [2, 5, 10, 20] : PRESET_AMOUNTS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDepositAmount(String(preset))}
                    className={cn(
                      "py-2 px-2 rounded-lg text-xs font-mono border transition-colors cursor-pointer text-center font-bold",
                      depositAmount === String(preset)
                        ? "bg-zinc-800 text-emerald-400 border-emerald-500/40"
                        : "bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
                    )}
                  >
                    +{accountCurrency === 'USD' ? `$${preset}` : `${preset.toLocaleString()} T`}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference / TXID */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 block">
                {accountCurrency === 'USD' ? 'Transaction Hash / TXID' : 'Transaction Ref / Tracking No.'}{' '}
                <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input 
                type="text"
                placeholder={accountCurrency === 'USD' ? "e.g. TXID / Blockchain Hash" : "e.g. Shetab Tracking Ref"}
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700 font-mono"
              />
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-200 block">
                Receipt Screenshot <span className="text-rose-400 font-bold">*</span>
              </label>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[95px]",
                  dragActive 
                    ? "border-emerald-500 bg-emerald-500/10" 
                    : receiptBase64 
                      ? "border-zinc-700 bg-zinc-950" 
                      : "border-zinc-700/80 hover:border-zinc-600 bg-zinc-950/60"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />

                {receiptPreview ? (
                  <div className="flex items-center justify-between w-full p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img 
                        src={receiptPreview} 
                        alt="Receipt Preview" 
                        className="w-10 h-10 rounded object-cover" 
                      />
                      <div className="min-w-0 text-left">
                        <span className="text-xs font-bold text-zinc-200 truncate block">{receiptFileName}</span>
                        <span className="text-[10px] text-emerald-400 font-medium">Ready to submit</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded cursor-pointer shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={20} className="mb-1 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-200">Browse or drop receipt screenshot</span>
                    <span className="text-[11px] text-zinc-400 mt-0.5">JPEG, PNG or PDF up to 10MB</span>
                  </>
                )}
              </div>
            </div>

            {/* Additional Note */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 block">
                Additional Note <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input 
                type="text"
                placeholder="e.g. Transferred from Mobile Bank"
                value={userMemo}
                onChange={(e) => setUserMemo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={
                isSubmitting || 
                parseFloat(depositAmount) < minRequired || 
                !receiptBase64
              }
              className={cn(
                "w-full py-3 font-bold rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center space-x-1.5 cursor-pointer mt-3",
                !isSubmitting && parseFloat(depositAmount) >= minRequired && receiptBase64
                  ? "bg-zinc-100 hover:bg-white text-zinc-950 shadow-md"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center space-x-1.5">
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Submitting Slip...</span>
                </span>
              ) : (
                <span>Submit Verification Slip</span>
              )}
            </button>

            {/* Security Note */}
            <div className="pt-2 border-t border-zinc-800/40 flex items-center space-x-2 text-xs text-zinc-400">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>We only store transfer screenshots. We never collect card PINs or passwords.</span>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}

export default ClientTopupWallet;