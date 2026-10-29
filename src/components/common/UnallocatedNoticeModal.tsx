// src/components/common/UnallocatedNoticeModal.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, X, Copy, Check, Radio, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export function UnallocatedNoticeModal() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<any[]>([]);
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedSub, setCopiedSub] = useState(false);
  const [subUrl, setSubUrl] = useState<string>('');

  const fetchNoticesAndSub = async () => {
    try {
      const [noticeRes, configRes] = await Promise.all([
        api.get<any[]>('/api/notifications/unacknowledged').catch(() => []),
        api.get<any>('/api/node/configs/me').catch(() => null),
      ]);

      setNotices(Array.isArray(noticeRes) ? noticeRes : []);
      if (configRes?.subscription_url) {
        setSubUrl(`${window.location.origin}${configRes.subscription_url}`);
      }
    } catch {
      setNotices([]);
    }
  };

  useEffect(() => {
    fetchNoticesAndSub();
  }, []);

  if (notices.length === 0) return null;

  const currentNotice = notices[0];
  const isServerReplaced = currentNotice.category === 'server_replaced';

  const handleAcknowledge = async () => {
    if (!hasConfirmedCheckbox) return;
    setSubmitting(true);
    try {
      await api.post(`/api/notifications/${currentNotice.id}/acknowledge`);
      setNotices(prev => prev.filter(n => n.id !== currentNotice.id));
      setHasConfirmedCheckbox(false);
    } catch {
      // Handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopySub = () => {
    if (!subUrl) return;
    navigator.clipboard.writeText(subUrl);
    setCopiedSub(true);
    setTimeout(() => setCopiedSub(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121214] border border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative text-left">
        
        <div className="flex items-start space-x-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isServerReplaced
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            {isServerReplaced ? <Radio size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">{currentNotice.title}</h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              {isServerReplaced ? 'Urgent Server Migration' : 'System Notice'}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-normal">
          {currentNotice.message}
        </div>

        {/* 1-Click Subscription Link Copy for Server Replacement Notices */}
        {isServerReplaced && subUrl && (
          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
            <span className="text-[11px] text-zinc-300 font-medium">Subscription Link:</span>
            <button
              type="button"
              onClick={handleCopySub}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              {copiedSub ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedSub ? 'Copied Link' : 'Copy Link'}</span>
            </button>
          </div>
        )}

        {/* Action Suggestions for Store Credit */}
        {!isServerReplaced && (
          <div className="space-y-1.5 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-200 block">Available Options:</span>
            <p>• This balance is available in your wallet for all active Traffic Routing server locations.</p>
            <p>• You can also request a bank refund back to your Shetab card at any time.</p>
          </div>
        )}

        {/* Mandatory Checkbox */}
        <label className="flex items-start space-x-2.5 text-xs text-zinc-300 cursor-pointer pt-2 border-t border-zinc-850 select-none">
          <input 
            type="checkbox"
            checked={hasConfirmedCheckbox}
            onChange={e => setHasConfirmedCheckbox(e.target.checked)}
            className="mt-0.5 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
          />
          <span className="leading-tight">
            {isServerReplaced
              ? 'I understand I must update the subscription link in my Traffic Routing application.'
              : 'I have read and understood this notice completely.'}
          </span>
        </label>

        {/* Confirm Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!hasConfirmedCheckbox || submitting}
            onClick={handleAcknowledge}
            className="w-full py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-md"
          >
            <span>{submitting ? 'Acknowledging...' : 'I Understand & Accept'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}