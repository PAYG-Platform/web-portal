// src/pages/ClientRefundRequest.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, AlertCircle, CheckCircle2, 
  RefreshCw, ShieldCheck, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../components/ui/StatCard';

export function ClientRefundRequest() {
  const navigate = useNavigate();

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

  const [loading, setLoading] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRefundableBalances = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/api/billing/refunds/balances');
      if (data) {
        setRefundableInfo({
          available_balance: Number(data.available_balance) || 0,
          can_refund: data.can_refund !== false,
          refund_cooldown_days: data.refund_cooldown_days || 30,
          days_until_next_refund: data.days_until_next_refund || 0,
        });
        setAmount(String(data.available_balance || ''));
      }
    } catch {
      setRefundableInfo({
        available_balance: 0,
        can_refund: false,
        refund_cooldown_days: 30,
        days_until_next_refund: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefundableBalances();
  }, []);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join('-') : '');
    if (errors.cardNumber) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.cardNumber;
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!refundableInfo.can_refund) {
      showToast(
        `Refund cooldown active: 1 refund every ${refundableInfo.refund_cooldown_days} days. Next request in ${refundableInfo.days_until_next_refund} day(s).`,
        'error'
      );
      return;
    }

    const numAmount = parseFloat(amount);
    const newErrors: { [key: string]: string } = {};

    if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid refund amount.';
    } else if (numAmount > refundableInfo.available_balance) {
      newErrors.amount = `Amount exceeds available balance (${refundableInfo.available_balance.toLocaleString()} Toman).`;
    }

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (cleanCard.length !== 16) {
      newErrors.cardNumber = 'Card number must be exactly 16 digits.';
    }

    if (!cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await api.post('/api/billing/refunds/request', {
        amount: numAmount,
        destination_account: `Shetab: ${cardNumber} (Cardholder: ${cardholderName.trim()})`,
        reason: reason.trim() || undefined
      });

      showToast('Refund request submitted! Track payout status under Payment Histories.', 'success');
      setReason('');
      fetchRefundableBalances();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit refund claim.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in",
          toastMessage.type === 'success' ? 'bg-zinc-950 border-emerald-500/30 text-emerald-400' : 'bg-zinc-950 border-rose-500/30 text-rose-400'
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Wallet size={20} className="text-emerald-400" />
            <span>Refund Request</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Withdraw unconsumed deposit balances back to your card (1 refund every {refundableInfo.refund_cooldown_days} days).
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/client/history?tab=refunds')}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
        >
          <span>Histories</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Main Claim Form */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/70 p-5 space-y-4">
        
        {/* Refundable Balance Banner */}
        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
              Available Refundable Balance
            </span>
            <span className="text-lg font-bold font-mono text-zinc-100">
              {loading ? '—' : `${refundableInfo.available_balance.toLocaleString()} Toman`}
            </span>
          </div>

          {!refundableInfo.can_refund && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
              Cooldown: {refundableInfo.days_until_next_refund}d remaining
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Amount */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <label className="font-medium text-zinc-300">
                Refund Amount (Toman) <span className="text-rose-400">*</span>
              </label>
              {refundableInfo.available_balance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(refundableInfo.available_balance))}
                  className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                >
                  Withdraw Max ({refundableInfo.available_balance.toLocaleString()} T)
                </button>
              )}
            </div>

            <div className="relative">
              <input 
                type="number"
                min="0"
                step="1000"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-xl bg-zinc-950 border text-xs text-zinc-100 font-mono font-semibold outline-none transition-colors",
                  errors.amount ? "border-rose-500" : "border-zinc-800 focus:border-zinc-700"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                Toman
              </span>
            </div>
            {errors.amount && (
              <p className="text-[11px] text-rose-400">{errors.amount}</p>
            )}
          </div>

          {/* Shetab Card Number */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-300 block">
              Destination Shetab Card <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="6037-xxxx-xxxx-xxxx"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className={cn(
                "w-full px-3 py-2 rounded-xl bg-zinc-950 border text-xs text-zinc-100 font-mono outline-none transition-colors tracking-wider",
                errors.cardNumber ? "border-rose-500" : "border-zinc-800 focus:border-zinc-700"
              )}
            />
            {errors.cardNumber && (
              <p className="text-[11px] text-rose-400">{errors.cardNumber}</p>
            )}
          </div>

          {/* Cardholder Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-300 block">
              Cardholder Name (As on Card) <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. Ali Rezaei"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-xl bg-zinc-950 border text-xs text-zinc-100 outline-none transition-colors",
                errors.cardholderName ? "border-rose-500" : "border-zinc-800 focus:border-zinc-700"
              )}
            />
            {errors.cardholderName && (
              <p className="text-[11px] text-rose-400">{errors.cardholderName}</p>
            )}
          </div>

          {/* Reason / Memo */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-300 block">
              Reason / Memo (Optional)
            </label>
            <input 
              type="text"
              placeholder="e.g. Unconsumed deposit balance"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-zinc-700"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isSubmitting || !refundableInfo.can_refund || refundableInfo.available_balance <= 0 || parseFloat(amount) <= 0}
            className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer mt-3 shadow-md"
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-1.5">
                <RefreshCw size={14} className="animate-spin" />
                <span>Submitting...</span>
              </span>
            ) : (
              <span>Submit Refund Request</span>
            )}
          </button>

          {/* Policy Note */}
          <div className="pt-2 border-t border-zinc-800/50 flex items-center space-x-1.5 text-[10px] text-zinc-400">
            <ShieldCheck size={13} className="text-zinc-400 shrink-0" />
            <span>Promotional gift credits are non-refundable. Payouts process within 1-3 business days.</span>
          </div>

        </form>
      </div>

    </div>
  );
}

export default ClientRefundRequest;