// src/pages/ClientOverview.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, QrCode, Copy, Zap, 
  Activity, Globe, X, Link as LinkIcon, 
  Gift, Lock, ArrowRight, Sparkles, Check, PieChart as PieIcon, Radio, RefreshCw,
  TrendingUp
} from 'lucide-react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { QRCodeView } from '../components/common/QRCodeView';
import { api } from '../services/api';
import { cn } from '../components/ui/StatCard';

interface WalletBucketItem {
  id: string;
  bucket_type: 'GIFT' | 'FIAT' | 'CRYPTO';
  priority?: number;
  location_id?: string;
  location_name?: string;
  balance: number;
}

interface UserConfigItem {
  id: string | number;
  server_id: string | number;
  server_name: string;
  location: string;
  protocol: string;
  price_per_gb_toman?: number;
  price_per_gb?: number;
  currency?: string;
  uri: string;
  data_used_bytes?: number;
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

interface CombinedTrendItem {
  day: string;
  date_iso: string;
  data_mb: number;
  data_bytes: number;
  topup_toman: number;
  gift_toman: number;
}

const DEFAULT_CHART_COLORS = ['#00b4d8', '#2563eb', '#f59e0b', '#84cc16', '#64748b', '#8b5cf6', '#0369a1', '#a855f7', '#6366f1'];

export function ClientOverview() {
  const navigate = useNavigate();

  // 1. Balance & Wallet Buckets State
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [accountCurrency, setAccountCurrency] = useState<'IRT' | 'USD'>('IRT');
  const [frozenRefundAmount, setFrozenRefundAmount] = useState<number>(0);
  const [walletBuckets, setWalletBuckets] = useState<WalletBucketItem[]>([]);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);

  // 2. Traffic Routing Configs & Subscription
  const [configs, setConfigs] = useState<UserConfigItem[]>([]);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string>('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [universalCopied, setUniversalCopied] = useState(false);

  // 3. QR Modal States
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalTitle, setQrModalTitle] = useState('');
  const [qrModalValue, setQrModalValue] = useState('');
  const [modalCopied, setModalCopied] = useState(false);

  // 4. 30-Day Bandwidth & Financial Telemetry State
  const [trendData, setTrendData] = useState<CombinedTrendItem[]>([]);
  const [totalTrafficBytes, setTotalTrafficBytes] = useState(0);

  // 5. ISP & Provider Distribution State
  const [providerStats, setProviderStats] = useState<ProviderStatItem[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // 6. Live Polling Indicator
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- A. Fetch Wallet Balances ---
  const fetchWalletData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingBalance(true);
    try {
      const res = await api.get<{
        total_balance: number;
        frozen_refund_amount: number;
        currency: string;
        buckets: WalletBucketItem[];
      }>('/api/billing/topups/balance');

      if (res && res.buckets) {
        setTotalBalance(res.total_balance || 0);
        setAccountCurrency(String(res.currency || 'IRT').toUpperCase() as any);
        setFrozenRefundAmount(res.frozen_refund_amount || 0);
        setWalletBuckets(res.buckets);
      }
    } catch {
      if (isInitial) {
        setTotalBalance(0);
        setFrozenRefundAmount(0);
        setWalletBuckets([]);
      }
    } finally {
      if (isInitial) setLoadingBalance(false);
    }
  }, []);

  // --- B. Fetch Active Server Configurations ---
  const fetchConfigs = useCallback(async () => {
    try {
      const res = await api.get<{
        subscription_url: string;
        sub_token: string;
        configs: UserConfigItem[];
      }>('/api/node/configs/me');

      if (res && Array.isArray(res.configs)) {
        setConfigs(res.configs);
        const origin = window.location.origin;
        setSubscriptionUrl(`${origin}${res.subscription_url}`);
      }
    } catch {
      // Handled silently
    }
  }, []);

  // --- C. Fetch 30-Day Bandwidth & Financial Telemetry ---
  const fetch30DayTrends = useCallback(async () => {
    try {
      const [trafficRes, financialRes] = await Promise.all([
        api.get<any[]>('/api/traffic/client/daily?days=30').catch(() => []),
        api.get<any[]>('/api/billing/analytics/client/daily-financial-trends?days=30').catch(() => [])
      ]);

      const trafficList = Array.isArray(trafficRes) ? trafficRes : [];
      const financialList = Array.isArray(financialRes) ? financialRes : [];

      const trafficMap = new Map(trafficList.map(t => [t.date_iso, t]));
      const financialMap = new Map(financialList.map(f => [f.date_iso, f]));

      let totalBytes = 0;
      const merged: CombinedTrendItem[] = [];
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const tData = trafficMap.get(iso) || { bytes: 0, mb: 0 };
        const fData = financialMap.get(iso) || { topup_toman: 0, gift_toman: 0 };

        totalBytes += Number(tData.bytes || 0);

        merged.push({
          day: dayLabel,
          date_iso: iso,
          data_bytes: Number(tData.bytes || 0),
          data_mb: Number(tData.mb || (Number(tData.bytes || 0) / (1024 ** 2))),
          topup_toman: Number(fData.topup_toman || 0),
          gift_toman: Number(fData.gift_toman || 0)
        });
      }

      setTotalTrafficBytes(totalBytes);
      setTrendData(merged);
    } catch {
      // Handled silently
    }
  }, []);

  // --- D. Fetch ISP / Provider Traffic Statistics ---
  const fetchProviderStats = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingProviders(true);
    try {
      const res = await api.get<{ total_bytes: number; providers: ProviderStatItem[] }>('/api/traffic/client/provider-stats');
      if (res && Array.isArray(res.providers)) {
        setProviderStats(res.providers);
      }
    } catch {
      if (isInitial) setProviderStats([]);
    } finally {
      if (isInitial) setLoadingProviders(false);
    }
  }, []);

  // --- E. Master Refresh Trigger ---
  const refreshAllData = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    await Promise.allSettled([
      fetchWalletData(isInitial),
      fetchConfigs(),
      fetch30DayTrends(),
      fetchProviderStats(isInitial)
    ]);
    if (!isInitial) {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, [fetchWalletData, fetchConfigs, fetch30DayTrends, fetchProviderStats]);

  // Aggregate ISP usage by Provider (combining multiple device IPs under their respective ISP)
  const groupedProviders = useMemo(() => {
    if (!providerStats || providerStats.length === 0) return [];

    const totalBytes = providerStats.reduce((acc, p) => acc + (p.bytes || 0), 0);
    if (totalBytes === 0) return [];

    const providerMap = new Map<string, {
      name: string;
      country: string;
      bytes: number;
      color: string;
      ips: Set<string>;
    }>();

    for (const item of providerStats) {
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
  }, [providerStats]);

  useEffect(() => {
    refreshAllData(true);
    const interval = setInterval(() => {
      refreshAllData(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const handleCopyUri = (idx: number, uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyUniversal = () => {
    if (!subscriptionUrl) return;
    navigator.clipboard.writeText(subscriptionUrl);
    setUniversalCopied(true);
    setTimeout(() => setUniversalCopied(false), 2000);
  };

  const openQrModal = (title: string, value: string) => {
    setQrModalTitle(title);
    setQrModalValue(value);
    setModalCopied(false);
    setQrModalOpen(true);
  };

  const giftBalance = walletBuckets
    .filter(b => b.bucket_type === 'GIFT')
    .reduce((acc, b) => acc + (Number(b.balance) || 0), 0);

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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-sans pb-16 px-0 min-w-0">
      
      {/* 1. HERO WALLET SECTION */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isRefreshing ? "bg-emerald-400 animate-spin" : "bg-emerald-500"
              )} />
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Available Wallet Balance</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <div className="flex items-baseline space-x-1.5">
                <h1 className={cn(
                  "text-3xl sm:text-4xl font-extrabold tracking-tight font-mono",
                  totalBalance < 0 ? "text-rose-400" : "text-zinc-100"
                )}>
                  {loadingBalance 
                    ? '—' 
                    : accountCurrency === 'USD'
                      ? totalBalance < 0 ? `-$${Math.abs(totalBalance).toFixed(2)}` : `$${totalBalance.toFixed(2)}`
                      : totalBalance < 0
                        ? `-${Math.abs(Math.floor(totalBalance)).toLocaleString()}`
                        : Math.floor(totalBalance || 0).toLocaleString()}
                </h1>
                <span className={cn(
                  "text-xs font-semibold",
                  totalBalance < 0 ? "text-rose-400 font-bold" : "text-emerald-400"
                )}>
                  {accountCurrency === 'USD' ? 'USD' : 'Toman'} {totalBalance < 0 && '(Overdue Debt)'}
                </span>
              </div>

              {giftBalance > 0 && (
                <span 
                  className="inline-flex items-center space-x-1 text-[11px] font-mono font-bold text-purple-300 bg-purple-950/40 border border-purple-800/60 px-2 py-0.5 rounded-md" 
                  title="Promotional non-refundable gift balance"
                >
                  <Gift size={12} className="text-purple-400 shrink-0" />
                  <span>
                    +{accountCurrency === 'USD' ? `$${giftBalance.toFixed(2)}` : `${Math.floor(giftBalance).toLocaleString()} T`} Gift
                  </span>
                </span>
              )}

              {Number(frozenRefundAmount) > 0 && (
                <span 
                  className="inline-flex items-center space-x-1 text-[11px] font-mono text-zinc-400 bg-zinc-850 border border-zinc-800 px-2 py-0.5 rounded-md" 
                  title="Amount locked in pending refund requests"
                >
                  <Lock size={10} className="text-amber-400 shrink-0" />
                  <span>
                    {accountCurrency === 'USD' ? `$${Number(frozenRefundAmount).toFixed(2)}` : `${Math.floor(Number(frozenRefundAmount) || 0).toLocaleString()} T`} locked
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => refreshAllData(false)}
              disabled={isRefreshing}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-xl text-xs transition-colors cursor-pointer"
              title="Refresh Now"
            >
              <RefreshCw size={14} className={cn(isRefreshing && "animate-spin text-emerald-400")} />
            </button>

            <button 
              type="button"
              onClick={() => navigate('/client/wallet')}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer active:scale-[0.99] shrink-0"
            >
              <Zap size={14} className="fill-zinc-950" />
              <span>Top-Up Wallet</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSAL SUBSCRIPTION LINK BAR */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <LinkIcon size={14} className="text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Universal Subscription Link
            </h3>
          </div>
          <p className="text-xs text-zinc-400 font-normal">
            Single URL automatically syncing all your active server nodes and protocols.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <div className="flex-1 md:w-72 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs font-mono text-zinc-400 truncate select-all">
            {subscriptionUrl || 'Generating subscription link...'}
          </div>

          <button
            type="button"
            onClick={handleCopyUniversal}
            className={cn(
              "h-9 px-3.5 rounded-xl text-xs font-medium inline-flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0",
              universalCopied 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750"
            )}
          >
            {universalCopied ? <Check size={13} /> : <Copy size={13} />}
            <span>{universalCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => openQrModal("Universal Subscription QR Code", subscriptionUrl)}
            className="h-9 px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-medium inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Scan QR Code"
          >
            <QrCode size={14} />
          </button>
        </div>
      </div>

      {/* 3. DUAL-AXIS 30-DAY TELEMETRY & ISP PROVIDER PIE CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2-Cols: Dual-Axis Bandwidth + Top-Up + Gift Multi-Metric Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/40 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-400" />
                <span>30-Day Usage & Top-Up Telemetry</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {accountCurrency === 'USD'
                  ? "Left axis: Bandwidth (MB / GB). Right axis: Approved Top-ups (Green) in USD ($)."
                  : "Left axis: Bandwidth (MB / GB). Right axis: Approved Top-ups (Green) in Toman."}
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-300 font-semibold bg-zinc-950 border border-zinc-855 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              {(totalTrafficBytes / (1024 ** 3)).toFixed(2)} GB Total Traffic
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 15, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bandwidthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b4d8" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="#00b4d8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.5} />

                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }} 
                    dy={6} 
                    interval="preserveStartEnd"
                  />

                  {/* Left Y-Axis: Bandwidth (MB / GB) with 35% Top Headroom */}
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#00b4d8', fontSize: 10 }}
                    tickFormatter={formatDataAxis}
                    width={55}
                    domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 100)]}
                  />

                  {/* Right Y-Axis: Dynamic Dollar ($) vs Toman Scaling */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#10b981', fontSize: 10 }}
                    tickFormatter={(val: number) => {
                      if (accountCurrency === 'USD') {
                        return `$${val.toFixed(val >= 10 ? 0 : 2)}`;
                      }
                      return formatCurrencyAxis(val);
                    }}
                    width={55}
                    domain={[
                      0, 
                      (dataMax: number) => {
                        if (accountCurrency === 'USD') {
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
                      color: '#f4f4f5',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === "Bandwidth") {
                        return [formatDataAxis(Number(value)), name];
                      }
                      if (accountCurrency === 'USD') {
                        return [`$${Number(value).toFixed(2)} USD`, name];
                      }
                      return [`${Number(value).toLocaleString()} Toman`, name];
                    }}
                    labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                  />

                  <Legend 
                    verticalAlign="top" 
                    height={32}
                    content={({ payload }) => (
                      <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-medium text-zinc-400 pb-2">
                        {payload?.map((entry: any, index: number) => (
                          <div key={`legend-${index}`} className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[11px]">{entry.value}</span>
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
                    fill="url(#bandwidthGrad)" 
                  />

                  {/* Approved Top-ups Line (Right Axis - Green) - Dots ONLY on active days */}
                  <Line 
                    yAxisId="right"
                    type="monotone"
                    name="Approved Top-ups"
                    dataKey="topup_toman"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload || !payload.topup_toman || payload.topup_toman <= 0) return <></>;
                      return (
                        <circle 
                          key={`dot-topup-${cx}-${cy}`} 
                          cx={cx} 
                          cy={cy} 
                          r={4} 
                          fill="#10b981" 
                          stroke="#09090b" 
                          strokeWidth={2} 
                        />
                      );
                    }}
                    activeDot={{ r: 5.5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xs font-mono">
                No telemetry recorded recently.
              </div>
            )}
          </div>
        </div>

        {/* Right 1-Col: ISP Provider Traffic Share Pie Chart */}
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <PieIcon size={15} className="text-emerald-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                ISP Traffic Share
              </h3>
            </div>
          </div>

          {/* Pie Chart Display Area */}
          <div className="h-44 w-full flex items-center justify-center relative">
            {groupedProviders.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupedProviders}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={0}
                    labelLine={false}
                    label={renderCustomizedLabel}
                    stroke="#09090b"
                    strokeWidth={2}
                  >
                    {groupedProviders.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '11px', color: '#f4f4f5' }}
                    formatter={(val: any, name: string) => {
                      const prov = groupedProviders.find(p => p.name === name);
                      const mb = ((prov?.bytes || 0) / (1024 ** 2)).toFixed(1);
                      const ipList = prov?.ips && prov.ips.length > 0 ? `\nIPs: ${prov.ips.join(', ')}` : '';
                      return [`${val}% (${mb} MB)${ipList}`, name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-1 text-zinc-500 text-xs font-mono">
                <Radio size={22} className="mx-auto text-zinc-700 mb-1" />
                <p>Waiting for connection...</p>
                <p className="text-[10px] text-zinc-600">Connect to Traffic Routing config to detect ISP</p>
              </div>
            )}
          </div>

          {/* Provider Share Legend List Grouped by ISP */}
          <div className="space-y-1.5 pt-1 border-t border-zinc-850/60 max-h-28 overflow-y-auto pr-1">
            {groupedProviders.length > 0 ? (
              groupedProviders.map((prov, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: prov.color || DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length] }} 
                    />
                    <div className="min-w-0">
                      <span className="text-zinc-200 truncate text-[11px] font-medium block" title={prov.name}>
                        {prov.name}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-zinc-100 shrink-0 ml-2">
                    {prov.percentage}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-zinc-500 text-center py-1">
                Cellular and Home Fiber subnets auto-classified.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. ACTIVE SERVER CONFIGURATIONS GRID */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Globe size={14} className="text-emerald-400" />
            <span>Active Server Nodes ({configs.length})</span>
          </h2>

          <button
            type="button"
            onClick={() => navigate('/client/vpn-servers')}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {configs.length > 0 ? (
            configs.map((config, idx) => (
              <div 
                key={config.id || idx}
                className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-4 flex flex-col justify-between space-y-3.5 hover:border-zinc-750 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <h3 className="text-xs font-bold text-zinc-100 truncate">{config.server_name}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 shrink-0">
                      {config.protocol}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-mono truncate">{config.location}</p>

                  <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-855/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500 text-[10px]">RATE</span>
                    <span className="text-zinc-200 font-semibold">
                      {accountCurrency === 'USD' || config.currency === 'USD' ? (
                        <span className="text-emerald-400">
                          ${((config.price_per_gb ?? config.price_per_gb_toman) || 0.05).toFixed(2)}{' '}
                          <span className="text-[10px] text-zinc-500 font-normal font-sans">/ GB</span>
                        </span>
                      ) : (
                        <span>
                          {Math.floor(Number(config.price_per_gb || config.price_per_gb_toman) || 0).toLocaleString()}{' '}
                          <span className="text-[10px] text-zinc-500 font-normal font-sans">T / GB</span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-zinc-850/60">
                  <button 
                    type="button"
                    onClick={() => openQrModal(`${config.server_name} QR Code`, config.uri)}
                    className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="QR Code"
                  >
                    <QrCode size={13} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleCopyUri(idx, config.uri)}
                    className={cn(
                      "flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center space-x-1",
                      copiedIdx === idx 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750"
                    )}
                  >
                    {copiedIdx === idx ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedIdx === idx ? 'Copied' : 'Copy URI'}</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-10 text-center rounded-2xl bg-zinc-900/20 border border-dashed border-zinc-800/80 p-6 space-y-1.5">
              <Sparkles size={18} className="mx-auto text-zinc-600 mb-1" />
              <p className="text-xs font-semibold text-zinc-300">No Active Configurations Found</p>
              <p className="text-xs text-zinc-500">
                Top up your wallet to auto-provision and activate proxy routes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REAL SCANNABLE QR CODE MODAL */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setQrModalOpen(false)} 
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
            >
              <X size={15} />
            </button>

            <div className="space-y-0.5 text-left pr-4">
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">{qrModalTitle}</h4>
              <p className="text-xs text-zinc-400">Scan with your Traffic Routing application</p>
            </div>

            <div className="flex justify-center">
              <QRCodeView value={qrModalValue} size={160} />
            </div>

            <div className="bg-zinc-950 border border-zinc-855 rounded-xl p-2 flex items-center justify-between">
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
                title="Copy URI"
              >
                {modalCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
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

    </div>
  );
}

export default ClientOverview;