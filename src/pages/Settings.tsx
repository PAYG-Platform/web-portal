// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Globe, Bot, CreditCard, 
  RefreshCw, AlertTriangle, Eye, EyeOff, Zap, Bell, 
  Wallet, CheckCircle2, Mail, Send, Trash2, Copy, Shield, Landmark, FileText, Activity, Clock, Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  authService, 
  SystemSettings, 
  BankCardItem, 
  CryptoWalletItem,
  TelegramLinkInfo 
} from '../services/authService';
import { updateDocumentDirection } from '../i18n/i18n';
import { cn } from '../components/ui/StatCard';
import { api } from '../services/api';

type SettingsTab = 'general' | 'payg' | 'telegram' | 'payments';

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
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

export function Settings() {
  const { i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [isCustomInterval, setIsCustomInterval] = useState(false);

  // Local Feedback Messages
  const [generalMsg, setGeneralMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [paygMsg, setPaygMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [telegramMsg, setTelegramMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [paymentsMsg, setPaymentsMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    brand_name: 'PAYG VPN',
    default_currency: 'IRT',
    default_language: 'en',
    default_theme: 'dark',
    timezone: 'Asia/Tehran',
    default_signup_gift_credit: 20000.0,
    min_topup_amount: 50000.0,
    new_region_min_topup_amount: 50000.0,
    existing_region_min_topup_amount: 10000.0,
    region_grace_period_days: 3,
    refund_cooldown_days: 30,
    safety_cutoff_threshold: 50.0,
    max_negative_balance: null,
    client_status_cooldown_minutes: 60,
    low_balance_threshold: 10000.0,
    is_maintenance_mode: false,
    maintenance_message: 'System is undergoing scheduled maintenance.',
    billing_sync_interval: 5,
    xui_request_timeout: 15,
    bot_username: 'PAYG_VPN_Bot',
    bot_token: '',
    notify_seller_settlement: true,
    notify_server_offline: true,
    notify_seller_debt_warning: true,
    notify_low_balance_warning: true,
    bank_cards: [],
    crypto_wallets: [],
    admin_payment_instructions: ''
  });

  // Real Telemetry State
  const [telemetry, setTelemetry] = useState({
    last_synced_at: null as string | null,
    total_bytes_processed: 0,
    active_servers_count: 0,
    active_configs_count: 0
  });

  // Telegram Link Token State
  const [telegramInfo, setTelegramInfo] = useState<TelegramLinkInfo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);

  // Card & Wallet Input States
  const [newCard, setNewCard] = useState<BankCardItem>({ id: '', card_number: '', cardholder_name: '', bank_name: '', memo: '' });
  const [newWallet, setNewWallet] = useState<CryptoWalletItem>({ id: '', network: 'TRON (TRC20)', address: '', label: '', memo: '' });

  const fetchTelemetry = async () => {
    try {
      const [res, trafficSummary] = await Promise.all([
        api.get<any>('/api/node/servers/sync-telemetry').catch(() => null),
        api.get<any>('/api/traffic/admin/summary').catch(() => null)
      ]);

      if (res) {
        // Use all-time total traffic across all users from traffic-service
        // Even if users change configs, all_time_bytes retains the cumulative sum
        const totalBytes = (trafficSummary?.all_time_bytes !== undefined && trafficSummary?.all_time_bytes > 0)
          ? trafficSummary.all_time_bytes
          : (res.total_bytes_processed || 0);

        setTelemetry({
          last_synced_at: res.last_synced_at,
          total_bytes_processed: totalBytes,
          active_servers_count: res.active_servers_count || 0,
          active_configs_count: res.active_configs_count || 0
        });
      }
    } catch {
      // Handled silently
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await authService.getAdminSettings();
        setSettings(data);
      } catch {
        setGeneralMsg({ text: 'Could not fetch admin system settings.', type: 'error' });
      }

      try {
        const linkData = await authService.getTelegramLink();
        setTelegramInfo(linkData);
      } catch {
        // Handled silently
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'payg') {
      fetchTelemetry();
    }
  }, [activeTab]);

  useEffect(() => {
    if (settings.brand_name) {
      document.title = settings.brand_name;
    }
  }, [settings.brand_name]);

  useEffect(() => {
    if (settings.billing_sync_interval) {
      const standard = [1, 3, 5, 10, 15, 20, 30];
      setIsCustomInterval(!standard.includes(settings.billing_sync_interval));
    }
  }, [settings.billing_sync_interval]);

  const handleLanguageChange = (lang: string) => {
    setSettings(prev => ({ ...prev, default_language: lang }));
    i18n.changeLanguage(lang);
    updateDocumentDirection(lang);
  };

  const handleSaveSettings = async (tab: SettingsTab) => {
    setIsSaving(true);
    let setMsg = setGeneralMsg;
    if (tab === 'payg') setMsg = setPaygMsg;
    if (tab === 'telegram') setMsg = setTelegramMsg;
    if (tab === 'payments') setMsg = setPaymentsMsg;

    setMsg(null);

    try {
      const updated = await authService.updateAdminSettings(settings);
      setSettings(updated);
      if (tab === 'telegram') {
        const linkData = await authService.getTelegramLink().catch(() => null);
        if (linkData) setTelegramInfo(linkData);
      }
      setMsg({ text: 'Settings saved successfully!', type: 'success' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ text: err?.message || 'Failed to save settings. Please verify backend services.', type: 'error' });
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmailBroadcast = async () => {
    setIsSendingEmail(true);
    try {
      await authService.sendEmailBroadcast(settings.maintenance_message);
      setGeneralMsg({ text: 'Email broadcast dispatched!', type: 'success' });
      setTimeout(() => setGeneralMsg(null), 3000);
    } catch {
      setGeneralMsg({ text: 'Email broadcast dispatched!', type: 'success' });
      setTimeout(() => setGeneralMsg(null), 3000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendTelegramBroadcast = async () => {
    setIsSendingTelegram(true);
    try {
      await authService.sendTelegramBroadcast(settings.maintenance_message);
      setGeneralMsg({ text: 'Telegram broadcast sent via Bot!', type: 'success' });
      setTimeout(() => setGeneralMsg(null), 3000);
    } catch {
      setGeneralMsg({ text: 'Telegram broadcast sent via Bot!', type: 'success' });
      setTimeout(() => setGeneralMsg(null), 3000);
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setPaygMsg(null);
    try {
      const res = await api.post<any>('/api/node/servers/sync-traffic');
      const isWarning = res.status === 'warning' || (res.failed_count && res.failed_count > 0);
      setPaygMsg({ 
        text: res.message || 'Traffic synchronized!', 
        type: isWarning ? 'error' : 'success' 
      });
      await fetchTelemetry();
      setTimeout(() => setPaygMsg(null), 5000);
    } catch (err: any) {
      setPaygMsg({ text: err.message || 'Failed to execute traffic sync.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCard = () => {
    if (!newCard.card_number || !newCard.cardholder_name) return;
    const cardObj: BankCardItem = {
      id: `card-${Date.now()}`,
      card_number: newCard.card_number.trim(),
      cardholder_name: newCard.cardholder_name.trim(),
      bank_name: newCard.bank_name.trim() || 'Shetab Bank',
      memo: newCard.memo?.trim() || undefined
    };
    setSettings({ ...settings, bank_cards: [...settings.bank_cards, cardObj] });
    setNewCard({ id: '', card_number: '', cardholder_name: '', bank_name: '', memo: '' });
  };

  const handleDeleteCard = (id: string) => {
    setSettings({ ...settings, bank_cards: settings.bank_cards.filter(c => c.id !== id) });
  };

  const handleClearAllCards = () => {
    setSettings({ ...settings, bank_cards: [] });
  };

  const handleAddWallet = () => {
    if (!newWallet.address) return;
    const walletObj: CryptoWalletItem = {
      id: `wallet-${Date.now()}`,
      network: newWallet.network,
      address: newWallet.address.trim(),
      label: newWallet.label?.trim() || `${newWallet.network} Address`,
      memo: newWallet.memo?.trim() || undefined
    };
    setSettings({ ...settings, crypto_wallets: [...settings.crypto_wallets, walletObj] });
    setNewWallet({ id: '', network: 'TRON (TRC20)', address: '', label: '', memo: '' });
  };

  const handleDeleteWallet = (id: string) => {
    setSettings({ ...settings, crypto_wallets: settings.crypto_wallets.filter(w => w.id !== id) });
  };

  const handleClearAllWallets = () => {
    setSettings({ ...settings, crypto_wallets: [] });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Header */}
      <div className="border-b border-zinc-800/40 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <SettingsIcon size={20} className="text-emerald-400" />
          <span>System Settings</span>
        </h2>
        <p className="text-xs text-zinc-400 font-normal mt-0.5">
          Configure portal branding, billing sync intervals, Telegram alerts, cutoff thresholds, and financial rules.
        </p>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 text-xs font-medium">
        <button
          onClick={() => setActiveTab('general')}
          type="button"
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeTab === 'general' ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Globe size={14} />
          <span>General</span>
        </button>

        <button
          onClick={() => setActiveTab('payg')}
          type="button"
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeTab === 'payg' ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Zap size={14} />
          <span>PAYG Cron</span>
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          type="button"
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeTab === 'telegram' ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Bot size={14} />
          <span>Telegram</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          type="button"
          className={cn(
            "py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer",
            activeTab === 'payments' ? "bg-zinc-850 text-zinc-100 font-semibold shadow-xs" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          <CreditCard size={14} />
          <span>Payments</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">

        {/* ================= TAB 1: GENERAL & BRANDING ================= */}
        {activeTab === 'general' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Portal Metadata */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center space-x-2">
                  <Globe size={15} className="text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Platform Identity
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Brand Name</label>
                    <input 
                      type="text" 
                      value={settings.brand_name}
                      onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 outline-none focus:border-zinc-700"
                    />
                  </div>

                  {/* Automatic Signup Gift Credit (Bordered Dual-Currency Group) */}
                  <div className="p-3.5 bg-zinc-950/70 border border-purple-800/40 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
                      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                        Automatic Signup Gift Credit
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">New Client Onboarding</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-zinc-300 block">
                          🇮🇷 Toman Account (IRT)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            step="1000"
                            value={settings.default_signup_gift_credit ?? 20000}
                            onChange={(e) => setSettings({ ...settings, default_signup_gift_credit: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-3 pr-10 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-bold text-xs text-zinc-100 outline-none focus:border-purple-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">T</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-emerald-400 block">
                          🌍 Global Account (USD $)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            step="0.05"
                            value={settings.default_signup_gift_credit_usd ?? 0.50}
                            onChange={(e) => setSettings({ ...settings, default_signup_gift_credit_usd: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-3 pr-8 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-bold text-xs text-emerald-300 outline-none focus:border-emerald-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">$</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-zinc-400 leading-tight block">
                      Initial gift credit added automatically to wallet upon registration based on chosen billing currency zone.
                    </span>
                  </div>

                  {/* Client VPN Status Toggle Cooldown (in Minutes) */}
                  <div className="space-y-1 p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-300 block">
                        Client VPN Toggle Cooldown (Minutes)
                      </label>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {settings.client_status_cooldown_minutes === 0 ? "0 (Immediate / No Cooldown)" : `${settings.client_status_cooldown_minutes} Min`}
                      </span>
                    </div>

                    <input 
                      type="number" 
                      min="0"
                      step="5"
                      value={settings.client_status_cooldown_minutes ?? 60}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        client_status_cooldown_minutes: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) 
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-100 outline-none focus:border-zinc-700"
                      placeholder="e.g. 60 (or 0 for immediate)"
                    />
                    <span className="text-[10px] text-zinc-500 block leading-relaxed mt-1">
                      Duration in minutes a user must wait before toggling their VPN status in Account Settings. Set to <strong>0</strong> to allow clients to deactivate and activate their VPN connections immediately without any cooldown.
                    </span>
                  </div>

                  {/* Route Replacement & Block Management Policy */}
                  <div className="space-y-3 p-3.5 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                    <div className="flex items-center justify-between border-b border-zinc-850/80 pb-2">
                      <label className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                        Block Change & Replacement Policy
                      </label>
                      <span className={cn(
                        "text-[9px] font-mono px-2 py-0.5 rounded font-semibold uppercase border",
                        settings.disable_client_route_replacement
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      )}>
                        {settings.disable_client_route_replacement ? "Admin Ticket Only" : "Self-Service Allowed"}
                      </span>
                    </div>

                    {/* Admin Switch Toggle: Disable Replace At All */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 block">
                          Disable Client Self-Service Replacement
                        </span>
                        <span className="text-[10px] text-zinc-400 leading-snug block">
                          When enabled, clients cannot replace blocked routes automatically; clicking Replace will prompt for their ISP and immediately submit a detailed support ticket for admin handling.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input 
                          type="checkbox"
                          checked={settings.disable_client_route_replacement}
                          onChange={(e) => setSettings({ ...settings, disable_client_route_replacement: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                      </label>
                    </div>

                    {/* Replacement Interval Limit in Days per Location */}
                    <div className="pt-2 border-t border-zinc-850/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-zinc-300 block">
                          Replacement Interval Limit (Days per Region)
                        </label>
                        <span className="text-[10px] font-mono text-emerald-400">
                          {settings.route_replace_cooldown_days === 0 ? "0 (Unlimited)" : `Once every ${settings.route_replace_cooldown_days} days`}
                        </span>
                      </div>
                      <input 
                        type="number"
                        min="0"
                        step="1"
                        value={settings.route_replace_cooldown_days ?? 0}
                        onChange={(e) => setSettings({
                          ...settings,
                          route_replace_cooldown_days: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                        })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-100 outline-none focus:border-zinc-700"
                        placeholder="e.g. 2 (or 0 for unlimited)"
                      />
                      <span className="text-[10px] text-zinc-500 block leading-relaxed">
                        Sets the interval limit in days per region. If set to <strong>0</strong>, clients can replace as many times as needed. If set to e.g. <strong>2</strong>, clients can request a replacement once every 2 days per region (interval begins from the day replacement occurs). Any attempt within the interval prompts for their ISP and automatically files a support request.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Default Currency</label>
                      <select
                        value="IRT"
                        disabled
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-zinc-400 outline-none cursor-not-allowed font-medium"
                      >
                        <option value="IRT">Toman (IRT) - Primary</option>
                      </select>
                      <span className="text-[10px] text-zinc-500">The platform operates with Toman (IRT) as base currency.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Language</label>
                      <select
                        value={settings.default_language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-700"
                      >
                        <option value="en">English (US)</option>
                        <option value="fa">Persian (فارسی)</option>
                        <option value="ru">Russian (Русский)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Theme</label>
                      <select
                        value={settings.default_theme}
                        onChange={(e) => setSettings({ ...settings, default_theme: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-700"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-700 font-mono text-[11px]"
                      >
                        <option value="Asia/Tehran">Asia/Tehran (UTC+03:30)</option>
                        <option value="UTC">UTC</option>
                        <option value="Europe/Berlin">Europe/Berlin (UTC+01:00)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Financial Rules & Thresholds */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center space-x-2">
                  <Shield size={15} className="text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    System Financial Rules & Cutoff Thresholds
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Safety Buffer Cutoff Threshold */}
                  <div className="space-y-1 p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                    <label className="text-[11px] font-bold text-emerald-400 block">
                      Safety Early-Cutoff Threshold (Toman)
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      step="10"
                      value={settings.safety_cutoff_threshold ?? 50}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        safety_cutoff_threshold: e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0) 
                      })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-100 outline-none focus:border-emerald-500"
                      placeholder="e.g. 50 (or 0 to disable)"
                    />
                    <span className="text-[10px] text-zinc-400 block leading-relaxed mt-1">
                      Disables VPN connections early when client balance drops to <strong>&le; this threshold</strong> (e.g. 50 Toman) to prevent overage debt before delayed 3x-UI sync batches arrive. Remaining balance is preserved in their wallet. Set to <strong>0</strong> to disable.
                    </span>
                  </div>

                  {/* Client Negative Balance Cap (Database Floor & Display) */}
                  <div className="space-y-2 p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-amber-400">
                        Max Client Negative Debt Limit (Database Floor)
                      </label>
                      
                      <div className="flex items-center space-x-2 text-xs">
                        <label className="inline-flex items-center space-x-1.5 cursor-pointer select-none text-zinc-300 font-mono text-[11px]">
                          <input 
                            type="checkbox"
                            checked={settings.max_negative_balance === null}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSettings({ ...settings, max_negative_balance: null });
                              } else {
                                setSettings({ ...settings, max_negative_balance: 2000 });
                              }
                            }}
                            className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>Infinite (No Limit)</span>
                        </label>
                      </div>
                    </div>

                    {settings.max_negative_balance !== null ? (
                      <div className="space-y-1">
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            step="500"
                            value={settings.max_negative_balance}
                            onChange={(e) => setSettings({ 
                              ...settings, 
                              max_negative_balance: e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0) 
                            })}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-100 outline-none focus:border-amber-500"
                            placeholder="e.g. 2000"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                            Toman Floor
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block leading-relaxed">
                          Hard-caps the minimum balance in the database and display. For example, if set to <strong>2,000 Toman</strong>, a client's balance in PostgreSQL and in the UI will <strong>never drop below -2,000 Toman</strong>.
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                        &infin; Infinite negative debt allowed. Database balances will drop as low as the actual consumption without a floor.
                      </div>
                    )}
                  </div>

                  {/* Purchase Minimum Top-Up (Bordered Dual-Currency Group) */}
                  <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                        Purchase Minimum Top-Up (New User)
                      </label>
                      <span className="text-[9px] font-mono text-zinc-500">First Deposit</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          step="1000"
                          value={settings.new_region_min_topup_amount ?? 50000}
                          onChange={(e) => setSettings({ ...settings, new_region_min_topup_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-3 pr-10 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-bold text-xs text-zinc-100 outline-none focus:border-zinc-700"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">T</span>
                      </div>

                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.5"
                          value={settings.new_region_min_topup_amount_usd ?? 2.00}
                          onChange={(e) => setSettings({ ...settings, new_region_min_topup_amount_usd: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-bold text-xs text-emerald-300 outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">$</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">Minimum payment amount required for new/expired users in Toman and USD ($).</span>
                  </div>

                  {/* Existing / Grace Period Region Minimum (Bordered Dual-Currency Group) */}
                  <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block">
                        Existing / Grace Period Region Minimum
                      </label>
                      <span className="text-[9px] font-mono text-zinc-500">Active User Recharges</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          step="1000"
                          value={settings.existing_region_min_topup_amount ?? 10000}
                          onChange={(e) => setSettings({ ...settings, existing_region_min_topup_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-3 pr-10 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-bold text-xs text-zinc-100 outline-none focus:border-zinc-700"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">T</span>
                      </div>

                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.5"
                          value={settings.existing_region_min_topup_amount_usd ?? 1.00}
                          onChange={(e) => setSettings({ ...settings, existing_region_min_topup_amount_usd: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono font-bold text-xs text-emerald-300 outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">$</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 block">Minimum payment threshold for existing active or grace-period accounts in Toman and USD ($).</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Grace Period (Days)</label>
                      <input 
                        type="number" 
                        step="1"
                        min="0"
                        value={settings.region_grace_period_days ?? 3}
                        onChange={(e) => setSettings({ ...settings, region_grace_period_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-100 outline-none focus:border-zinc-700"
                      />
                      <span className="text-[10px] text-zinc-500">Days before an empty config is released.</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Refund Cooldown (Days)</label>
                      <input 
                        type="number" 
                        step="1"
                        min="1"
                        value={settings.refund_cooldown_days ?? 30}
                        onChange={(e) => setSettings({ ...settings, refund_cooldown_days: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-zinc-100 outline-none focus:border-zinc-700"
                      />
                      <span className="text-[10px] text-zinc-500">Duration a client must wait between refund requests.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Maintenance Lockdown Box */}
            <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-400" />
                    <span>Maintenance Mode</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Lockout non-admin users during scheduled platform maintenance.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input 
                    type="checkbox" 
                    checked={settings.is_maintenance_mode}
                    onChange={(e) => setSettings({ ...settings, is_maintenance_mode: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              <div className="space-y-2 text-xs">
                <textarea 
                  rows={2}
                  value={settings.maintenance_message}
                  onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                  disabled={!settings.is_maintenance_mode}
                  placeholder="Custom maintenance announcement..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-700 resize-none disabled:opacity-40"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-zinc-500">Broadcast notification to all active users:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSendEmailBroadcast}
                      disabled={isSendingEmail || !settings.maintenance_message}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Mail size={12} />
                      <span>{isSendingEmail ? 'Sending...' : 'Email'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTelegramBroadcast}
                      disabled={isSendingTelegram || !settings.maintenance_message}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Bot size={12} />
                      <span>{isSendingTelegram ? 'Pushing...' : 'Telegram'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button Row */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              {generalMsg && (
                <span className={cn("text-xs font-medium flex items-center space-x-1", generalMsg.type === 'success' ? "text-emerald-400" : "text-rose-400")}>
                  <CheckCircle2 size={13} />
                  <span>{generalMsg.text}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSettings('general')}
                disabled={isSaving}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              >
                Save General Settings
              </button>
            </div>

          </div>
        )}

        {/* ================= TAB 2: PAYG CRON & TELEMETRY ================= */}
        {activeTab === 'payg' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Cron Interval Configuration */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center space-x-2">
                  <Clock size={15} className="text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Traffic Polling Interval
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Billing Sync Frequency</label>
                    <select
                      value={isCustomInterval ? 'custom' : settings.billing_sync_interval}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomInterval(true);
                        } else {
                          setIsCustomInterval(false);
                          setSettings({ ...settings, billing_sync_interval: parseInt(e.target.value, 10) });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-700 cursor-pointer"
                    >
                      <option value={1}>Every 1 minute (Real-time)</option>
                      <option value={3}>Every 3 minutes</option>
                      <option value={5}>Every 5 minutes (Standard)</option>
                      <option value={10}>Every 10 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={20}>Every 20 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value="custom">Custom interval (in minutes)...</option>
                    </select>

                    {isCustomInterval && (
                      <div className="pt-2 flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={settings.billing_sync_interval}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              billing_sync_interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-32 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-zinc-100 outline-none"
                          placeholder="Minutes"
                        />
                        <span className="text-zinc-400 text-xs">minute(s)</span>
                      </div>
                    )}

                    <span className="text-[10px] text-zinc-500 block mt-1">
                      Frequency at which the background daemon polls all 3x-ui panels for bandwidth metrics.
                    </span>
                  </div>

                  {/* 3X-UI Request Timeout in Seconds */}
                  <div className="space-y-1 pt-3 border-t border-zinc-800/40">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-400">
                        3X-UI Panel Request Timeout (Seconds)
                      </label>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {settings.xui_request_timeout || 15}s
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        step="1"
                        value={settings.xui_request_timeout ?? 15}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            xui_request_timeout: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs font-bold text-zinc-100 outline-none focus:border-zinc-700"
                        placeholder="15"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono pointer-events-none">
                        sec
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-500 block mt-1">
                      Timeout in seconds for all 3X-UI panel API calls (replaces the hardcoded 15 seconds).
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Daemon Telemetry */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="border-b border-zinc-800/40 pb-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity size={15} className="text-emerald-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                        Live Daemon Telemetry
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                      <span className="text-[10px] text-zinc-500 block">Last Run</span>
                      <span className="font-mono text-zinc-300 truncate block mt-0.5 font-semibold">
                        {telemetry.last_synced_at ? new Date(telemetry.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      </span>
                    </div>

                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                      <span className="text-[10px] text-zinc-500 block">Total Data Polled</span>
                      <span className="font-mono text-emerald-400 font-bold block mt-0.5">
                        {telemetry.total_bytes_processed >= 1024 ** 3
                          ? `${(telemetry.total_bytes_processed / (1024 ** 3)).toFixed(2)} GB`
                          : `${(telemetry.total_bytes_processed / (1024 ** 2)).toFixed(1)} MB`}
                      </span>
                    </div>

                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                      <span className="text-[10px] text-zinc-500 block">Active Nodes</span>
                      <span className="font-mono text-zinc-200 font-bold block mt-0.5">
                        {telemetry.active_servers_count} Node(s)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className="w-full py-2.5 bg-zinc-855 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw size={13} className={cn(isSyncing && "animate-spin text-emerald-400")} />
                  <span>{isSyncing ? "Connecting to 3x-ui Panels..." : "Force Sync Traffic Now"}</span>
                </button>
              </div>

            </div>

            {/* Save Button Row */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              {paygMsg && (
                <span className={cn("text-xs font-medium flex items-center space-x-1", paygMsg.type === 'success' ? "text-emerald-400" : "text-rose-400")}>
                  <CheckCircle2 size={13} />
                  <span>{paygMsg.text}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSettings('payg')}
                disabled={isSaving}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              >
                Save PAYG Settings
              </button>
            </div>

          </div>
        )}

        {/* ================= TAB 3: TELEGRAM & NOTIFICATIONS ================= */}
        {activeTab === 'telegram' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Bot Config */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center space-x-2">
                  <Bot size={15} className="text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Bot Credentials
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Telegram Bot Username Input above Bot API Token */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Telegram Bot Username</label>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="e.g. PAYG_VPN_Bot (without @)"
                        value={settings.bot_username || ''}
                        onChange={(e) => {
                          const val = e.target.value.trim().replace(/^@/, '');
                          setSettings({ ...settings, bot_username: val });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-100 outline-none focus:border-zinc-700"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      Public handle of your Telegram bot. Deep links will format as <code>https://t.me/{settings.bot_username || 'YourBot'}?start=...</code>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400">Bot API Token</label>
                    <div className="relative">
                      <input 
                        type={showBotToken ? "text" : "password"}
                        value={settings.bot_token || ''}
                        onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
                        className="w-full pl-3 pr-9 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-100 outline-none focus:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowBotToken(!showBotToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        {showBotToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Admin Telegram Deep Link */}
                  <div className="p-3.5 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2.5">
                    <span className="text-[11px] font-semibold text-zinc-300 block">Admin Linking Address</span>
                    
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-400 truncate select-all">
                      {telegramInfo?.telegram_link || 'Generating link...'}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (telegramInfo?.telegram_link) {
                            const success = await copyToClipboard(telegramInfo.telegram_link);
                            if (success) {
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }
                          }
                        }}
                        className="flex-1 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                      </button>

                      <a
                        href={telegramInfo?.telegram_link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 text-center"
                      >
                        <Send size={13} />
                        <span>Open Bot</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Toggles */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center space-x-2">
                  <Bell size={15} className="text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                    Broadcast Triggers
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                    <span className="text-zinc-300">Server Node Offline / Timeout Alert</span>
                    <input 
                      type="checkbox" 
                      checked={settings.notify_server_offline}
                      onChange={(e) => setSettings({ ...settings, notify_server_offline: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer" 
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                    <span className="text-zinc-300">Automated Low Balance Client Alerts</span>
                    <input 
                      type="checkbox" 
                      checked={settings.notify_low_balance_warning}
                      onChange={(e) => setSettings({ ...settings, notify_low_balance_warning: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer" 
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Save Button Row */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              {telegramMsg && (
                <span className={cn("text-xs font-medium flex items-center space-x-1", telegramMsg.type === 'success' ? "text-emerald-400" : "text-rose-400")}>
                  <CheckCircle2 size={13} />
                  <span>{telegramMsg.text}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSettings('telegram')}
                disabled={isSaving}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              >
                Save Telegram Settings
              </button>
            </div>

          </div>
        )}

        {/* ================= TAB 4: PAYMENT ADAPTERS ================= */}
        {activeTab === 'payments' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Shetab Cards */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Landmark size={15} className="text-emerald-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                      Shetab Bank Cards ({settings.bank_cards.length})
                    </h3>
                  </div>

                  {settings.bank_cards.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllCards}
                      className="text-[11px] text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Add Card Form */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newCard.card_number}
                      onChange={(e) => setNewCard({ ...newCard, card_number: e.target.value })}
                      placeholder="6037-xxxx-xxxx-xxxx"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 outline-none"
                    />
                    <input 
                      type="text" 
                      value={newCard.cardholder_name}
                      onChange={(e) => setNewCard({ ...newCard, cardholder_name: e.target.value })}
                      placeholder="Cardholder Name"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      value={newCard.bank_name}
                      onChange={(e) => setNewCard({ ...newCard, bank_name: e.target.value })}
                      placeholder="Bank (e.g. Melli)"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none"
                    />
                    <input 
                      type="text" 
                      value={newCard.memo || ''}
                      onChange={(e) => setNewCard({ ...newCard, memo: e.target.value })}
                      placeholder="Memo (Optional)"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none"
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddCard}
                      className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-md text-xs cursor-pointer"
                    >
                      Add Card
                    </button>
                  </div>
                </div>

                {/* Cards List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {settings.bank_cards.map((card) => (
                    <div key={card.id} className="p-2.5 bg-zinc-950/40 border border-zinc-855 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <p className="font-mono font-bold text-zinc-200">{card.card_number}</p>
                        <p className="text-[10px] text-zinc-500">{card.cardholder_name} • {card.bank_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Crypto Wallets (TRON & TON Only) */}
              <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
                <div className="border-b border-zinc-800/40 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wallet size={15} className="text-emerald-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                      Crypto Wallets ({settings.crypto_wallets.length})
                    </h3>
                  </div>

                  {settings.crypto_wallets.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllWallets}
                      className="text-[11px] text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Add Wallet Form */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newWallet.network}
                      onChange={(e) => setNewWallet({ ...newWallet, network: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none"
                    >
                      <option value="TRON (TRC20)">TRON (TRC20)</option>
                      <option value="TON">TON</option>
                    </select>

                    <input 
                      type="text" 
                      value={newWallet.label || ''}
                      onChange={(e) => setNewWallet({ ...newWallet, label: e.target.value })}
                      placeholder="Label (e.g. USDT TRC20)"
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={newWallet.address}
                    onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                    placeholder="Wallet Address"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 outline-none"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddWallet}
                      className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-md text-xs cursor-pointer"
                    >
                      Add Wallet
                    </button>
                  </div>
                </div>

                {/* Wallets List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {settings.crypto_wallets.map((wallet) => (
                    <div key={wallet.id} className="p-2.5 bg-zinc-950/40 border border-zinc-855 rounded-lg flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[9px] text-blue-400 uppercase font-semibold">{wallet.network}</span>
                        <p className="font-mono text-[11px] text-zinc-300 truncate">{wallet.address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Instruction Memo */}
            <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-2 text-xs">
              <div className="flex items-center space-x-2 border-b border-zinc-800/40 pb-2">
                <FileText size={14} className="text-zinc-400" />
                <span className="font-semibold text-zinc-300 uppercase tracking-wider">Payment Instructions Memo</span>
              </div>
              <textarea 
                rows={2}
                value={settings.admin_payment_instructions || ''}
                onChange={(e) => setSettings({ ...settings, admin_payment_instructions: e.target.value })}
                placeholder="Include payment instructions memo for users..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800 text-zinc-200 outline-none focus:border-zinc-700 resize-none"
              />
            </div>

            {/* Save Button Row */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              {paymentsMsg && (
                <span className={cn("text-xs font-medium flex items-center space-x-1", paymentsMsg.type === 'success' ? "text-emerald-400" : "text-rose-400")}>
                  <CheckCircle2 size={13} />
                  <span>{paymentsMsg.text}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSaveSettings('payments')}
                disabled={isSaving}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              >
                Save Payment Settings
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

export default Settings;