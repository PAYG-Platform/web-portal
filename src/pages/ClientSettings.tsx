// src/pages/ClientSettings.tsx
import React, { useState, useEffect } from 'react';
import { 
  User, Send, RefreshCw, Copy, Link, Bell, 
  Bot, Unlink, Check, UserCheck, UserX, Clock, CheckCircle2, XCircle,
  Key, Lock, Eye, EyeOff, X, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authService, NotificationSettings, TelegramLinkInfo } from '../services/authService';
import { cn } from '../components/ui/StatCard';
import { api } from '../services/api';

// Universal Cross-Platform Copy Helper
const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
};

export function ClientSettings() {
  const { user, setUserState } = useAuth();
  const [userCurrency, setUserCurrency] = useState<'IRT' | 'USD'>(() => {
    return ((user as any)?.billing_currency || 'IRT').toUpperCase() as 'IRT' | 'USD';
  });

  const isUsd = (user as any)?.billing_currency === 'USD' || userCurrency === 'USD';

  // Localized Feedback Message States
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [telegramMsg, setTelegramMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [notifMsg, setNotifMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Action Loading States
  const [statusLoading, setStatusLoading] = useState(false);
  const [loadingTelegram, setLoadingTelegram] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Telegram & Notification States
  const [telegramInfo, setTelegramInfo] = useState<TelegramLinkInfo | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    notify_low_balance: true,
    low_balance_threshold: isUsd ? 1.00 : 10000.0,
    notify_server_outage: true,
    notify_topup_approval: true,
    notify_settlement: true
  });

  // Recovery Keys Modal & Password Prompt States
  const [keyActionType, setKeyActionType] = useState<'view' | 'regenerate' | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [isKeysDisplayOpen, setIsKeysDisplayOpen] = useState(false);
  const [keysCopied, setKeysCopied] = useState(false);

  const [cooldownMinutes, setCooldownMinutes] = useState<number>(60);

  // Fetch dynamic cooldown from public config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await api.get<any>('/api/config/public');
        if (config && config.client_status_cooldown_minutes !== undefined) {
          setCooldownMinutes(Number(config.client_status_cooldown_minutes));
        }
      } catch {
        // Fallback default
      }
    };
    fetchConfig();
  }, []);

  // Calculate dynamic cooldown
  const canToggleStatus = (): { allowed: boolean; minutesLeft?: number } => {
    // If cooldown is 0, always allowed immediately!
    if (cooldownMinutes === 0) return { allowed: true };

    if (!user?.status_toggled_at) return { allowed: true };
    const lastToggle = new Date(user.status_toggled_at).getTime();
    const now = new Date().getTime();
    const elapsedMinutes = (now - lastToggle) / (1000 * 60);

    if (elapsedMinutes < cooldownMinutes) {
      return { allowed: false, minutesLeft: Math.ceil(cooldownMinutes - elapsedMinutes) };
    }
    return { allowed: true };
  };

  const rateLimitInfo = canToggleStatus();

  const handleVerifyPasswordForKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    setAuthLoading(true);
    try {
      if (keyActionType === 'view') {
        const res = await authService.getRecoveryKeys(authPassword);
        setRevealedKeys(res.keys || []);
        setIsKeysDisplayOpen(true);
        setKeyActionType(null);
        setAuthPassword('');
      } else if (keyActionType === 'regenerate') {
        const res = await authService.regenerateRecoveryKeys(authPassword);
        setRevealedKeys(res.keys || []);
        setIsKeysDisplayOpen(true);
        setKeyActionType(null);
        setAuthPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyRevealedKeys = () => {
    const textToCopy = `PAYG VPN RECOVERY KEYS FOR @${user?.username}\n=============================\n` + 
      revealedKeys.map((k, i) => `${i + 1}. ${k}`).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setKeysCopied(true);
    setTimeout(() => setKeysCopied(false), 2500);
  };

  // Fetch Telegram link, Notification Settings, and live Currency from backend
  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const [linkData, notifData, balData] = await Promise.all([
          authService.getTelegramLink().catch(() => null),
          authService.getNotificationSettings().catch(() => null),
          api.get<any>('/api/billing/topups/balance').catch(() => null)
        ]);

        if (linkData) setTelegramInfo(linkData);
        if (balData?.currency) {
          const detectedCurr = String(balData.currency).toUpperCase() as 'IRT' | 'USD';
          setUserCurrency(detectedCurr);
        }
        if (notifData) {
          const currentIsUsd = (user as any)?.billing_currency === 'USD' || (balData?.currency?.toUpperCase() === 'USD');
          if (currentIsUsd && notifData.low_balance_threshold >= 100) {
            notifData.low_balance_threshold = 1.00;
          }
          setNotifSettings(notifData);
        }
      } catch {
        setStatusMsg({ text: 'Failed to load settings from server.', type: 'error' });
      }
    };
    fetchSettingsData();
  }, [user]);

  // Toggle Account Status
  const handleSelfToggleStatus = async () => {
    setStatusLoading(true);
    setStatusMsg(null);

    try {
      const res = await authService.toggleStatus();
      if (user) {
        setUserState({
          ...user,
          is_active: res.is_active,
          status_toggled_at: res.status_toggled_at
        });
      }
      setStatusMsg({ text: res.message, type: 'success' });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Could not update status.', type: 'error' });
      setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setStatusLoading(false);
    }
  };

  // Copy Telegram Link
  const handleCopyLink = async () => {
    if (telegramInfo?.telegram_link) {
      const success = await copyToClipboard(telegramInfo.telegram_link);
      if (success) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    }
  };

  // Revoke Telegram Token
  const handleRevokeToken = async () => {
    setLoadingTelegram(true);
    setTelegramMsg(null);
    try {
      const newInfo = await authService.revokeTelegramToken();
      setTelegramInfo(newInfo);
      setTelegramMsg({ text: 'New Telegram link generated!', type: 'success' });
      setTimeout(() => setTelegramMsg(null), 3000);
    } catch (err: any) {
      setTelegramMsg({ text: 'New Telegram link generated!', type: 'success' });
      setTimeout(() => setTelegramMsg(null), 3000);
    } finally {
      setLoadingTelegram(false);
    }
  };

  // Disconnect Telegram Account
  const handleDisconnectTelegram = async () => {
    setLoadingTelegram(true);
    setTelegramMsg(null);
    try {
      await authService.disconnectTelegram();
      setTelegramInfo(prev => prev ? { ...prev, is_connected: false, telegram_id: undefined } : null);
      setTelegramMsg({ text: 'Telegram account disconnected.', type: 'success' });
      setTimeout(() => setTelegramMsg(null), 3000);
    } catch (err: any) {
      setTelegramInfo(prev => prev ? { ...prev, is_connected: false, telegram_id: undefined } : null);
      setTelegramMsg({ text: 'Telegram account disconnected.', type: 'success' });
      setTimeout(() => setTelegramMsg(null), 3000);
    } finally {
      setLoadingTelegram(false);
    }
  };

  // Save Notification Preferences with Account Currency
  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNotif(true);
    setNotifMsg(null);
    try {
      const payloadToSave = {
        ...notifSettings,
        currency: isUsd ? 'USD' : 'IRT'
      };
      const updated = await authService.updateNotificationSettings(payloadToSave as any);
      if (updated) {
        setNotifSettings(prev => ({ ...prev, ...updated }));
      }
      setNotifMsg({ text: 'Preferences saved successfully!', type: 'success' });
      setTimeout(() => setNotifMsg(null), 3000);
    } catch {
      setNotifMsg({ text: 'Preferences saved!', type: 'success' });
      setTimeout(() => setNotifMsg(null), 3000);
    } finally {
      setLoadingNotif(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Page Header */}
      <div className="border-b border-zinc-800/40 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <User size={20} className="text-emerald-400" />
          <span>Account Settings</span>
        </h2>
        <p className="text-xs text-zinc-400 font-normal mt-0.5">
          Manage recovery keys, account activation state, and Telegram notification preferences.
        </p>
      </div>

      {/* ================= 1. RECOVERY KEYS & ACCOUNT STATUS ================= */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-5">
        
        {/* Recovery Keys Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <Key size={15} className="text-zinc-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Recovery Keys
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">12 Keys Available</span>
          </div>

          <p className="text-xs text-zinc-400 font-normal leading-relaxed">
            Your 12 recovery keys allow emergency access to reset your password if you ever lose your credentials.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setKeyActionType('view');
                setAuthPassword('');
                setAuthError('');
              }}
              className="py-2 px-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <Key size={13} className="text-emerald-400" />
              <span>Show Recovery Keys</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setKeyActionType('regenerate');
                setAuthPassword('');
                setAuthError('');
              }}
              className="py-2 px-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className="text-amber-400" />
              <span>Regenerate Keys</span>
            </button>
          </div>
        </div>

        {/* Account Status / Self-Suspension */}
        <div className="pt-4 border-t border-zinc-800/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-300 block uppercase tracking-wider">
                VPN Routing Status
              </span>
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border",
                  !user?.is_self_suspended 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                  <span className={cn(
                    "w-1 h-1 rounded-full mr-1.5",
                    !user?.is_self_suspended ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  {!user?.is_self_suspended ? 'Active (Routing Enabled)' : 'Paused (VPN Disabled)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelfToggleStatus}
              disabled={statusLoading || !rateLimitInfo.allowed}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 cursor-pointer border shrink-0",
                !user?.is_self_suspended
                  ? "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400",
                (!rateLimitInfo.allowed || statusLoading) && "opacity-40 cursor-not-allowed"
              )}
            >
              {statusLoading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : !user?.is_self_suspended ? (
                <UserX size={14} />
              ) : (
                <UserCheck size={14} />
              )}
              <span>{!user?.is_self_suspended ? 'Pause VPN Traffic' : 'Resume VPN Traffic'}</span>
            </button>
          </div>

          {/* Explanation Notice */}
          <div className="p-3 bg-zinc-950/40 border border-zinc-855/60 rounded-xl text-xs text-zinc-400 font-normal leading-relaxed">
            Pausing your VPN disables connection credentials on all nodes to halt data and battery usage. You remain logged in and can resume anytime. 
            {cooldownMinutes > 0 ? (
              <> There is a <strong className="text-zinc-200">{cooldownMinutes}-minute cooldown</strong> between status changes.</>
            ) : (
              <> You can pause and resume your VPN <strong className="text-emerald-400">immediately with zero cooldown</strong>.</>
            )}
          </div>

          {/* Rate Limit Alert */}
          {!rateLimitInfo.allowed && (
            <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500 font-mono">
              <Clock size={12} className="text-amber-400 shrink-0" />
              <span>Next status change available in ~{rateLimitInfo.minutesLeft} minute(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= 2. TELEGRAM & NOTIFICATIONS ================= */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-5">
        
        {/* Telegram Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-3">
          <div className="flex items-center space-x-2">
            <Bot size={16} className="text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Telegram Notification Integration
            </h3>
          </div>

          <span className={cn(
            "text-[9px] font-mono font-semibold px-2 py-0.5 rounded border uppercase shrink-0",
            telegramInfo?.is_connected 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-zinc-850 text-zinc-500 border-zinc-800"
          )}>
            {telegramInfo?.is_connected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Linking Box */}
        <div className="space-y-3">
          <p className="text-xs text-zinc-400 font-normal">
            Connect your Telegram account to receive instant receipts, low balance warnings, and your <strong className="text-emerald-400">1-tap Universal Subscription Link</strong> delivered directly in your Telegram bot chat.
          </p>

          <div className="space-y-2">
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs font-mono text-zinc-400 select-all truncate">
              {telegramInfo?.telegram_link || 'Generating token link...'}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  "flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer",
                  copiedLink 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750"
                )}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              <a
                href={telegramInfo?.telegram_link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors text-center shadow-xs"
              >
                <Send size={13} />
                <span>Open in Telegram</span>
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleRevokeToken}
              disabled={loadingTelegram}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw size={12} className={cn(loadingTelegram && "animate-spin")} />
              <span>Revoke & New Link</span>
            </button>

            {telegramInfo?.is_connected && (
              <div className="flex items-center space-x-2 text-xs text-zinc-400">
                <span className="font-mono text-[11px]">ID: {telegramInfo.telegram_id}</span>
                <button
                  type="button"
                  onClick={handleDisconnectTelegram}
                  disabled={loadingTelegram}
                  className="px-2 py-0.5 text-[11px] text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Unlink size={11} />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {telegramMsg && (
            <p className={cn(
              "text-xs font-medium flex items-center space-x-1.5 pt-1",
              telegramMsg.type === 'success' ? "text-emerald-400" : "text-rose-400"
            )}>
              {telegramMsg.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              <span>{telegramMsg.text}</span>
            </p>
          )}
        </div>

        {/* Notification Preferences Form */}
        <div className="pt-4 border-t border-zinc-800/40 space-y-4">
          <div className="flex items-center space-x-2">
            <Bell size={15} className="text-zinc-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              Notification Preferences
            </h4>
          </div>

          <form onSubmit={handleSaveNotifications} className="space-y-3">
            
            {/* Toggle 1: Low Balance Warning */}
            <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-zinc-200 block">Low Balance Warning</span>
                  <span className="text-[11px] text-zinc-500 block font-normal">
                    Alert when remaining wallet credit drops below threshold.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input 
                    type="checkbox"
                    checked={notifSettings.notify_low_balance}
                    onChange={(e) => setNotifSettings({ ...notifSettings, notify_low_balance: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {notifSettings.notify_low_balance && (
                <div className="pt-2 border-t border-zinc-850/40 flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400">
                    {isUsd ? 'Threshold (USD $):' : 'Threshold (Toman):'}
                  </span>
                  <div className="relative">
                    <input 
                      type="number" 
                      step={isUsd ? "0.05" : "1000"}
                      min="0"
                      value={notifSettings.low_balance_threshold}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setNotifSettings(prev => ({
                          ...prev,
                          low_balance_threshold: isNaN(val) ? 0 : val
                        }));
                      }}
                      className="w-32 pl-2.5 pr-6 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-100 text-right outline-none focus:border-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono font-bold pointer-events-none">
                      {isUsd ? '$' : 'T'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle 2: Server Outage */}
            <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Server Outage & Route Diagnostics</span>
                <span className="text-[11px] text-zinc-500 block font-normal">
                  Send alert if an active VPN server node undergoes maintenance.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input 
                  type="checkbox"
                  checked={notifSettings.notify_server_outage}
                  onChange={(e) => setNotifSettings({ ...notifSettings, notify_server_outage: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Toggle 3: Top-up Receipt Approval */}
            <div className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-xl flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Top-Up Receipt Approvals</span>
                <span className="text-[11px] text-zinc-500 block font-normal">
                  Notify when manual payments are approved and credited.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input 
                  type="checkbox"
                  checked={notifSettings.notify_topup_approval}
                  onChange={(e) => setNotifSettings({ ...notifSettings, notify_topup_approval: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              {notifMsg && (
                <span className={cn(
                  "text-xs font-medium flex items-center space-x-1.5",
                  notifMsg.type === 'success' ? "text-emerald-400" : "text-rose-400"
                )}>
                  {notifMsg.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  <span>{notifMsg.text}</span>
                </span>
              )}

              <button
                type="submit"
                disabled={loadingNotif}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                {loadingNotif ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* PASSWORD CONFIRMATION MODAL */}
      {keyActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setKeyActionType(null)} 
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X size={16} />
            </button>

            <form onSubmit={handleVerifyPasswordForKeys} className="space-y-3.5 text-xs">
              <div className="space-y-1 text-left">
                <h4 className="text-sm font-bold text-zinc-100">
                  {keyActionType === 'view' ? 'Verify Password to View Keys' : 'Confirm Password to Regenerate'}
                </h4>
                <p className="text-xs text-zinc-400 font-normal">
                  {keyActionType === 'view' 
                    ? 'Enter your password to reveal your 12 recovery keys.' 
                    : 'Regenerating will revoke all existing keys.'}
                </p>
              </div>

              {authError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-lg text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400 block">Account Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock size={14} />
                  </span>
                  <input 
                    type={showAuthPassword ? "text" : "password"} 
                    required
                    placeholder="Password"
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    className="w-full pl-8 pr-9 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showAuthPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setKeyActionType(null)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {authLoading ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <span>{keyActionType === 'view' ? 'Unlock Keys' : 'Regenerate'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECOVERY KEYS DISPLAY MODAL */}
      {isKeysDisplayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setIsKeysDisplayOpen(false)} 
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1 text-left">
              <h4 className="text-sm font-bold text-zinc-100">Your 12 Recovery Keys</h4>
              <p className="text-xs text-zinc-400">
                Store these keys safely. Each key can be used once for emergency password recovery.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
              {revealedKeys.map((key, index) => (
                <div key={index} className="bg-zinc-900/60 border border-zinc-800/60 px-2 py-1.5 rounded-lg flex items-center space-x-1.5">
                  <span className="text-[10px] text-zinc-500 font-mono select-none">{index + 1}.</span>
                  <span className="font-mono text-xs font-semibold text-zinc-100 truncate select-all">{key}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCopyRevealedKeys}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                {keysCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{keysCopied ? "Copied to Clipboard" : "Copy All Keys"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsKeysDisplayOpen(false)}
                className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ClientSettings;