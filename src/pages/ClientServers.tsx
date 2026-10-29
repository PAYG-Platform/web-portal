// src/pages/ClientServers.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Server, Copy, Check, Search, QrCode, SlidersHorizontal, 
  X, CheckCircle2, Globe, Shield, RefreshCw, Plus, ArrowRight,
  Wifi, Sparkles, ExternalLink, ShieldAlert, Radio, AlertCircle
} from 'lucide-react';
import i18n from '../i18n/i18n';
import { QRCodeView } from '../components/common/QRCodeView';
import { api } from '../services/api';
import { cn } from '../components/ui/StatCard';
import { useAuth } from '../hooks/useAuth';

interface ClientConfig {
  id: string;
  server_id: string;
  server_name: string;
  location: string;
  protocol: string;
  price_per_gb_toman: number;
  price_per_gb?: number;
  currency?: string;
  uri: string;
  data_used_bytes?: number;
}

interface LocationMeta {
  id: string;
  name: string;
  country_code: string;
  flag: string;
}

export function ClientServers() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Real API State
  const [configs, setConfigs] = useState<ClientConfig[]>([]);
  const [locations, setLocations] = useState<LocationMeta[]>([]);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('All');

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSub, setCopiedSub] = useState(false);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalTitle, setQrModalTitle] = useState('');
  const [qrModalValue, setQrModalValue] = useState('');
  const [modalCopied, setModalCopied] = useState(false);

  const [replacingConfig, setReplacingConfig] = useState<ClientConfig | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [fallbackModalInfo, setFallbackModalInfo] = useState<{ message: string } | null>(null);

  // ISP Selection & Support Request Modal State
  const [isIspTicketModalOpen, setIsIspTicketModalOpen] = useState(false);
  const [ispTicketData, setIspTicketData] = useState<{
    config: ClientConfig;
    reasonTitle: string;
    reasonMessage: string;
  } | null>(null);
  const [selectedIsp, setSelectedIsp] = useState<string>('Irancell (MTN)');
  const [customIspInput, setCustomIspInput] = useState<string>('');
  const [isSubmittingIspTicket, setIsSubmittingIspTicket] = useState(false);

  // Common ISP Suggestions
  const SUGGESTED_ISPS = [
    'Irancell (MTN)',
    'MCI (Hamrah Aval)',
    'Rightel',
    'TCI / Mokhaberat',
    'Shatel',
    'Asiatech',
    'MobinNet',
    'Zitel',
    'Other'
  ];
  
  // Toast Alert State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch User Active Server Configurations & Locations
  const fetchServersData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [configsRes, locsRes] = await Promise.all([
        api.get<{
          subscription_url: string;
          sub_token: string;
          configs: ClientConfig[];
        }>('/api/node/configs/me').catch(() => null),
        api.get<LocationMeta[]>('/api/node/servers/locations').catch(() => [])
      ]);

      if (configsRes && Array.isArray(configsRes.configs)) {
        setConfigs(configsRes.configs);
        const origin = window.location.origin;
        setSubscriptionUrl(`${origin}${configsRes.subscription_url}`);
      } else if (isInitial) {
        setConfigs([]);
      }

      if (Array.isArray(locsRes)) {
        setLocations(locsRes);
      }
    } catch {
      if (isInitial) {
        showToast('Could not load server configurations.', 'error');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  // 2. Initial Mount and 30-Second Live Polling Loop
  useEffect(() => {
    fetchServersData(true);

    const interval = setInterval(() => {
      fetchServersData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Format clean protocol label
  const formatProtocolLabel = (proto: string): string => {
    const clean = (proto || '').toUpperCase().trim();
    if (clean.includes('REALITY') || clean === 'VLESS') return 'VLESS Reality';
    if (clean.includes('XHTTP')) return 'VLESS XHTTP';
    if (clean.includes('TROJAN')) return 'Trojan gRPC';
    if (clean.includes('VMESS')) return 'VMess WS';
    return clean || 'VLESS Reality';
  };

  // Format bytes into human-readable text
  const formatTrafficBytes = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleStartReplaceFlow = async (cfg: ClientConfig) => {
    try {
      const statusRes = await api.get<any>(`/api/node/configs/${cfg.id}/replace-status`);
      
      // If auto-ticket is required (Admin disabled, limit exceeded, or no capacity)
      if (statusRes.requires_support_ticket) {
        setIspTicketData({
          config: cfg,
          reasonTitle: statusRes.reason || 'Auto-Replacement Unavailable',
          reasonMessage: statusRes.message
        });
        setSelectedIsp('Irancell (MTN)');
        setCustomIspInput('');
        setIsIspTicketModalOpen(true);
        return;
      }
      
      // Otherwise, open normal replace confirmation modal
      setReplacingConfig(cfg);
    } catch (err: any) {
      setIspTicketData({
        config: cfg,
        reasonTitle: 'Support Request Required',
        reasonMessage: 'Auto-replacement status could not be verified automatically.'
      });
      setSelectedIsp('Irancell (MTN)');
      setCustomIspInput('');
      setIsIspTicketModalOpen(true);
    }
  };

  const handleExecuteReplaceBlocked = async () => {
    if (!replacingConfig) return;
    setIsReplacing(true);
    try {
      const res = await api.post<any>(`/api/node/configs/${replacingConfig.id}/replace-blocked`, {
        language: i18n.language || 'en'
      });
      if (res.success) {
        showToast(res.message, 'success');
        setReplacingConfig(null);
        await fetchServersData(false);
      } else if (res.auto_ticket) {
        setReplacingConfig(null);
        setFallbackModalInfo({ message: res.message });
        await fetchServersData(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to replace blocked configuration.', 'error');
    } finally {
      setIsReplacing(false);
    }
  };

  const handleSubmitIspSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ispTicketData) return;

    const finalIsp = (selectedIsp === 'Other' ? customIspInput.trim() : selectedIsp) || 'Not Specified';

    setIsSubmittingIspTicket(true);
    try {
      const res = await api.post<any>(`/api/node/configs/${ispTicketData.config.id}/replace-blocked`, {
        client_isp: finalIsp,
        language: i18n.language || 'en'
      });

      setIsIspTicketModalOpen(false);
      setFallbackModalInfo({ message: res.message });
      await fetchServersData(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit support request.', 'error');
    } finally {
      setIsSubmittingIspTicket(false);
    }
  };

  // Resolve country flag and regional metadata
  const getRegionMeta = (config: ClientConfig) => {
    const lowerName = config.server_name.toLowerCase();
    const lowerLoc = config.location.toLowerCase();

    for (const loc of locations) {
      if (
        lowerName.includes(loc.name.toLowerCase()) || 
        lowerName.includes(loc.country_code.toLowerCase()) ||
        lowerLoc.includes(loc.name.toLowerCase()) ||
        lowerLoc.includes(loc.country_code.toLowerCase())
      ) {
        return loc;
      }
    }

    if (lowerName.includes('us') || lowerName.includes('united states') || lowerName.includes('america')) {
      return { flag: '🇺🇸', name: 'United States', country_code: 'US' };
    }
    if (lowerName.includes('germany') || lowerName.includes('frankfurt') || lowerName.includes('de')) {
      return { flag: '🇩🇪', name: 'Germany', country_code: 'DE' };
    }
    if (lowerName.includes('netherlands') || lowerName.includes('amsterdam') || lowerName.includes('nl')) {
      return { flag: '🇳🇱', name: 'Netherlands', country_code: 'NL' };
    }
    if (lowerName.includes('turkey') || lowerName.includes('istanbul') || lowerName.includes('tr')) {
      return { flag: '🇹🇷', name: 'Turkey', country_code: 'TR' };
    }
    if (lowerName.includes('iran') || lowerName.includes('tehran') || lowerName.includes('ir')) {
      return { flag: '🇮🇷', name: 'Iran', country_code: 'IR' };
    }

    return { flag: '🌐', name: 'Global Region', country_code: 'INT' };
  };

  const handleCopySubLink = () => {
    if (!subscriptionUrl) return;
    navigator.clipboard.writeText(subscriptionUrl);
    setCopiedSub(true);
    showToast('Universal subscription link copied!', 'success');
    setTimeout(() => setCopiedSub(false), 2000);
  };

  const handleCopyConfigUri = (id: string, uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedId(id);
    showToast('Server connection string copied!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openQrModal = (title: string, value: string) => {
    setQrModalTitle(title);
    setQrModalValue(value);
    setModalCopied(false);
    setQrModalOpen(true);
  };

  // Filter application
  const filteredConfigs = configs.filter(cfg => {
    const q = searchQuery.toLowerCase().trim();
    const region = getRegionMeta(cfg);
    const matchesSearch = 
      cfg.server_name.toLowerCase().includes(q) ||
      cfg.location.toLowerCase().includes(q) ||
      region.name.toLowerCase().includes(q) ||
      region.country_code.toLowerCase().includes(q);

    const protoLabel = formatProtocolLabel(cfg.protocol);
    const matchesProtocol = 
      protocolFilter === 'All' || 
      protoLabel.toLowerCase().includes(protocolFilter.toLowerCase());

    return matchesSearch && matchesProtocol;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in",
          toastMessage.type === 'success' ? "bg-zinc-900 border-emerald-500/30 text-emerald-400" : "bg-zinc-900 border-rose-500/30 text-rose-400"
        )}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <X size={15} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Server size={20} className="text-emerald-400" />
            <span>Traffic Routing Server Configurations</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Real-time proxy nodes automatically synchronized every 30 seconds.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchServersData(true)}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Refresh Server List"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin text-emerald-400")} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/client/wallet')}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Top-Up Wallet</span>
          </button>
        </div>
      </div>

      {/* 1. UNIVERSAL SUBSCRIPTION HUB BAR */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-xs">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Universal Auto-Sync Subscription
            </h3>
          </div>
          <p className="text-xs text-zinc-400 font-normal">
            Import this single link to automatically synchronize all active server nodes into your Traffic Routing client.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <div className="flex-1 md:w-72 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-400 truncate select-all">
            {subscriptionUrl || 'Generating subscription URL...'}
          </div>

          <button
            type="button"
            onClick={handleCopySubLink}
            className={cn(
              "h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0",
              copiedSub 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750"
            )}
          >
            {copiedSub ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedSub ? 'Copied' : 'Copy All Links'}</span>
          </button>

          <button
            type="button"
            onClick={() => openQrModal("Universal Subscription QR Code", subscriptionUrl)}
            className="h-9 px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Scan Universal QR Code"
          >
            <QrCode size={14} />
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search server, country, or protocol..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-700 transition-colors h-9"
          />
        </div>

        {/* Protocol Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', 'VLESS', 'XHTTP', 'Trojan', 'VMess'].map((proto) => (
            <button
              key={proto}
              type="button"
              onClick={() => setProtocolFilter(proto)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer shrink-0",
                protocolFilter === proto
                  ? "bg-zinc-850 text-zinc-100 border-zinc-700 font-semibold"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {proto}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DESKTOP VIEW: DATA TABLE / LIST (>= lg) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider bg-zinc-850">
              <th className="py-3.5 px-5">Region / Location</th>
              <th className="py-3.5 px-5">Server Node</th>
              <th className="py-3.5 px-5">Protocol / Style</th>
              <th className="py-3.5 px-5">Billing Rate</th>
              <th className="py-3.5 px-5">Traffic Used</th>
              <th className="py-3.5 px-5">Status</th>
              <th className="py-3.5 px-5 text-right">Connection String</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-16 text-center text-xs text-zinc-500 font-mono">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw size={14} className="animate-spin text-emerald-400" />
                    <span>Loading server nodes...</span>
                  </div>
                </td>
              </tr>
            ) : filteredConfigs.length > 0 ? (
              filteredConfigs.map((config) => {
                const region = getRegionMeta(config);
                const protocolLabel = formatProtocolLabel(config.protocol);
                const isCopied = copiedId === config.id;

                return (
                  <tr 
                    key={config.id}
                    className="hover:bg-zinc-850/60 transition-colors group"
                  >
                    {/* Region / Country */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl select-none shrink-0" title={region.name}>{region.flag}</span>
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-200 block truncate">{region.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase block">{region.country_code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Server Node */}
                    <td className="py-3.5 px-5">
                      <div className="min-w-0">
                        <span className="font-bold text-zinc-100 block truncate group-hover:text-emerald-400 transition-colors">
                          {config.server_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono block truncate">
                          {config.location}
                        </span>
                      </div>
                    </td>

                    {/* Protocol / Style */}
                    <td className="py-3.5 px-5">
                      <span className="font-mono text-[11px] font-semibold text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 inline-block">
                        {protocolLabel}
                      </span>
                    </td>

                    {/* Billing Rate (Dynamic IRT vs USD) */}
                    <td className="py-3.5 px-5 font-mono font-bold text-zinc-200">
                      {user?.billing_currency === 'USD' || config.currency === 'USD' ? (
                        <span className="text-emerald-400">
                          ${((config.price_per_gb ?? config.price_per_gb_toman) || 0.05).toFixed(2)}{' '}
                          <span className="text-[10px] text-zinc-500 font-normal font-sans">/ GB</span>
                        </span>
                      ) : (
                        <span>
                          {(Number(config.price_per_gb_toman || config.price_per_gb) || 0).toLocaleString()}{' '}
                          <span className="text-[10px] text-zinc-500 font-normal font-sans">T / GB</span>
                        </span>
                      )}
                    </td>

                    {/* Live Traffic Used */}
                    <td className="py-3.5 px-5 font-mono text-zinc-300 font-semibold text-xs">
                      {formatTrafficBytes(config.data_used_bytes)}
                    </td>

                    {/* Active State */}
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1.5" />
                        Active
                      </span>
                    </td>

                    {/* Action: Copy URI, QR, and Replace Blocked */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartReplaceFlow(config)}
                          className="p-1.5 bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-amber-400 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Replace Blocked Route"
                        >
                          <Radio size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openQrModal(`${config.server_name} (${region.name})`, config.uri)}
                          className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="View QR Code"
                        >
                          <QrCode size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyConfigUri(config.id, config.uri)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center space-x-1",
                            isCopied
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750"
                          )}
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-16 text-center text-xs text-zinc-500 space-y-2">
                  <Sparkles size={22} className="mx-auto text-zinc-600 mb-1" />
                  <p className="font-semibold text-zinc-300">No Active Server Nodes Found</p>
                  <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
                    Top-up your wallet balance to activate server nodes for your preferred regions.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLET & MOBILE VIEW: RESPONSIVE CARDS (< lg) */}
      {/* ========================================================================= */}
      <div className="block lg:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading server nodes...</div>
        ) : filteredConfigs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredConfigs.map((config) => {
              const region = getRegionMeta(config);
              const protocolLabel = formatProtocolLabel(config.protocol);
              const isCopied = copiedId === config.id;

              return (
                <div 
                  key={config.id}
                  className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between space-y-3.5 hover:border-zinc-750 transition-colors shadow-xs"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Region Flag & Server Name & Protocol */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-2xl select-none shrink-0" title={region.name}>{region.flag}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-100 truncate">{config.server_name}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono truncate block">{region.name} ({region.country_code})</span>
                        </div>
                      </div>

                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-zinc-950 border border-zinc-800 text-zinc-300 shrink-0">
                        {protocolLabel}
                      </span>
                    </div>

                    {/* Metadata Grid with Rate & Live Used Bytes (Dynamic IRT vs USD) */}
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[9px] font-medium text-zinc-500 uppercase block">Rate / GB</span>
                        <span className="text-zinc-200 font-bold">
                          {user?.billing_currency === 'USD' || config.currency === 'USD' ? (
                            <span className="text-emerald-400">
                              ${((config.price_per_gb ?? config.price_per_gb_toman) || 0.05).toFixed(2)} / GB
                            </span>
                          ) : (
                            <span>
                              {(Number(config.price_per_gb_toman || config.price_per_gb) || 0).toLocaleString()}{' '}
                              <span className="text-[10px] text-zinc-500 font-normal font-sans">T / GB</span>
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleStartReplaceFlow(config)}
                      className="px-2.5 py-1.5 bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
                      title="Replace Blocked Route"
                    >
                      <Radio size={12} />
                      <span>Replace</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => openQrModal(`${config.server_name} (${region.name})`, config.uri)}
                      className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Show QR Code"
                    >
                      <QrCode size={13} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleCopyConfigUri(config.id, config.uri)}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1.5",
                        isCopied 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750"
                      )}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-zinc-900 border border-dashed border-zinc-800 space-y-2">
            <Sparkles size={20} className="mx-auto text-zinc-600 mb-1" />
            <p className="text-xs font-semibold text-zinc-300">No Active Server Nodes</p>
            <p className="text-xs text-zinc-500">
              Top up your wallet to activate Traffic Routing configurations for your preferred countries.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. QR CODE MODAL */}
      {/* ========================================================================= */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setQrModalOpen(false)} 
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
            >
              <X size={15} />
            </button>

            <div className="space-y-0.5 text-left pr-4">
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">{qrModalTitle}</h4>
              <p className="text-xs text-zinc-400">Scan directly in v2rayNG or Other Clients</p>
            </div>

            {/* Real Scannable Vector QR Code */}
            <div className="flex justify-center">
              <QRCodeView value={qrModalValue} size={160} />
            </div>

            {/* URI Preview & Copy */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[180px] select-all text-left">
                {qrModalValue}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrModalValue);
                  setModalCopied(true);
                  setTimeout(() => setModalCopied(false), 2000);
                }}
                className="p-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded border border-zinc-800 cursor-pointer shrink-0 ml-1"
                title="Copy"
              >
                {modalCopied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: SELECT ISP & SUBMIT AUTO SUPPORT TICKET */}
      {/* ========================================================================= */}
      {isIspTicketModalOpen && ispTicketData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Radio size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Direct Replacement Unavailable</h3>
                  <span className="text-[10px] font-mono text-zinc-400">{ispTicketData.config.server_name}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsIspTicketModalOpen(false)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitIspSupportTicket} className="space-y-3.5 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1 text-zinc-300">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                  Admin Dispatch Notice
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {ispTicketData.reasonMessage}
                </p>
              </div>

              {/* ISP Selector Section */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-zinc-200 block">
                  Select your Network Operator / ISP: <span className="text-rose-400">*</span>
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SUGGESTED_ISPS.map((isp) => (
                    <button
                      key={isp}
                      type="button"
                      onClick={() => setSelectedIsp(isp)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer",
                        selectedIsp === isp
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      )}
                    >
                      {isp}
                    </button>
                  ))}
                </div>

                {selectedIsp === 'Other' && (
                  <div className="pt-1.5 space-y-1 animate-in fade-in duration-150">
                    <label className="text-[10px] text-zinc-400 block">Enter your ISP name:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HiWeb, Dideban, Fanava, etc."
                      value={customIspInput}
                      onChange={(e) => setCustomIspInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <p className="text-[10px] text-zinc-500 leading-relaxed">
                An urgent support ticket will be automatically dispatched to administrators with your selected ISP ({selectedIsp === 'Other' ? (customIspInput || 'Custom') : selectedIsp}) and current server details.
              </p>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsIspTicketModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIspTicket || (selectedIsp === 'Other' && !customIspInput.trim())}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {isSubmittingIspTicket ? "Submitting..." : "Submit Support Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: CONFIRM ROUTE REPLACEMENT */}
      {/* ========================================================================= */}
      {replacingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Radio size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Replace Blocked Route</h3>
                  <span className="text-[10px] font-mono text-zinc-400">{replacingConfig.server_name}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setReplacingConfig(null)} 
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <p className="leading-relaxed">
                Is this connection blocked by your network provider?
              </p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                We will remove this route and automatically assign an alternate working inbound from this region with a <strong>different Host / SNI</strong>.
              </p>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setReplacingConfig(null)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReplacing}
                onClick={handleExecuteReplaceBlocked}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                {isReplacing ? <RefreshCw size={13} className="animate-spin" /> : <span>Confirm Replacement</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: NO ROUTE AVAILABLE / SUPPORT TICKET SUBMITTED */}
      {/* ========================================================================= */}
      {fallbackModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative text-left">
            <div className="flex items-start space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-zinc-100">Ticket Submitted to Administrator</h3>
                <span className="text-[10px] font-mono text-emerald-400">Automated Helpdesk Dispatch</span>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 leading-relaxed font-normal">
              {fallbackModalInfo.message}
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setFallbackModalInfo(null)}
                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setFallbackModalInfo(null);
                  navigate('/client/support');
                }}
                className="flex-1 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
              >
                <span>View Support Ticket</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ClientServers;