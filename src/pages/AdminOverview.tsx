// src/pages/AdminOverview.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Server, Users, Activity, TrendingUp, Plus, 
  ArrowRight, Receipt, Terminal, LayoutDashboard,
  RefreshCw, CheckCircle2, Cpu
} from 'lucide-react';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { StatItem } from '../types';
import { cn } from '../components/ui/StatCard';
import { api } from '../services/api';

interface DailyTrendItem {
  day: string;
  date_iso: string;
  data_bytes: number;
  data_mb: number;
  deposits: number;
  deposits_irt?: number;
  deposits_usd: number;
  paid_usage_toman: number;
}

export function AdminOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Live Metrics State
  const [metrics, setMetrics] = useState({
    total_deposits: 0,
    total_deposits_irt: 0,
    total_deposits_usd: 0,
    total_used_value: 0,
    total_used_value_irt: 0,
    total_used_value_usd: 0,
    total_refunds_approved_irt: 0,
    total_refunds_approved_usd: 0,
    total_refunds_pending_irt: 0,
    total_refunds_pending_usd: 0,
    total_active_wallets: 0,
    total_capacity: 0,
    used_capacity: 0,
    available_capacity: 0
  });

  const [servers, setServers] = useState<any[]>([]);
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<DailyTrendItem[]>([]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // API Composition Pattern: Fetch concurrently across decoupled domains with failure resilience
      const [
        analyticsRes, 
        locationsRes, 
        serversRes, 
        topupsRes, 
        refundsRes, 
        trafficTrendsRes, 
        billingTrendsRes
      ] = await Promise.all([
        api.get<any>('/api/billing/analytics/admin/summary').catch(() => null),
        api.get<any[]>('/api/node/servers/locations').catch(() => []),
        api.get<any[]>('/api/node/servers').catch(() => []),
        api.get<any[]>('/api/billing/topups/pending').catch(() => []),
        api.get<any[]>('/api/billing/refunds/pending').catch(() => []),
        // 1. Metering Domain: Raw Bandwidth Telemetry from Traffic Service
        api.get<any[]>('/api/traffic/admin/daily-trends?days=30').catch(() => []),
        // 2. Billing Domain: Paid Revenue & Usage in Toman from Billing Service
        api.get<any[]>('/api/billing/analytics/admin/daily-trends?days=30').catch(() => [])
      ]);

      // 1. Compute Capacity Metrics
      let tCap = 0;
      let uCap = 0;
      if (Array.isArray(locationsRes)) {
        locationsRes.forEach(loc => {
          tCap += (Number(loc.total_capacity) || 0);
          uCap += (Number(loc.used_capacity) || 0);
        });
      }

      if (analyticsRes) {
        setMetrics({
          total_deposits: Number(analyticsRes.total_deposits_irt ?? analyticsRes.total_deposits) || 0,
          total_deposits_irt: Number(analyticsRes.total_deposits_irt ?? analyticsRes.total_deposits) || 0,
          total_deposits_usd: Number(analyticsRes.total_deposits_usd) || 0,
          total_used_value: Number(analyticsRes.total_used_value_irt ?? analyticsRes.total_used_value) || 0,
          total_used_value_irt: Number(analyticsRes.total_used_value_irt ?? analyticsRes.total_used_value) || 0,
          total_used_value_usd: Number(analyticsRes.total_used_value_usd) || 0,
          total_refunds_approved_irt: Number(analyticsRes.total_refunds_approved_irt ?? analyticsRes.total_refunds_approved) || 0,
          total_refunds_approved_usd: Number(analyticsRes.total_refunds_approved_usd) || 0,
          total_refunds_pending_irt: Number(analyticsRes.total_refunds_pending_irt ?? analyticsRes.total_refunds_pending) || 0,
          total_refunds_pending_usd: Number(analyticsRes.total_refunds_pending_usd) || 0,
          total_active_wallets: Number(analyticsRes.total_active_wallets) || 0,
          total_capacity: tCap,
          used_capacity: uCap,
          available_capacity: Math.max(0, tCap - uCap)
        });
      }

      // 2. Set Servers List
      setServers(Array.isArray(serversRes) ? serversRes : []);

      // 3. Compose Dual-Axis Trend Data (Merging Traffic Telemetry + Financials by date_iso)
      const trafficList = Array.isArray(trafficTrendsRes) ? trafficTrendsRes : [];
      const billingList = Array.isArray(billingTrendsRes) ? billingTrendsRes : [];

      const trafficMap = new Map(trafficList.map(t => [t.date_iso, t]));
      const billingMap = new Map(billingList.map(b => [b.date_iso, b]));

      const composedTrends: DailyTrendItem[] = [];
      const today = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const tData = trafficMap.get(iso) || { data_bytes: 0, data_mb: 0 };
        const bData = billingMap.get(iso) || { deposits: 0, deposits_usd: 0, paid_usage_toman: 0 };

        composedTrends.push({
          day: dayLabel,
          date_iso: iso,
          data_bytes: tData.data_bytes || 0,
          data_mb: tData.data_mb || 0,
          deposits: bData.deposits || 0,
          deposits_irt: bData.deposits || 0,
          deposits_usd: Number(bData.deposits_usd || 0),
          paid_usage_toman: bData.paid_usage_toman || 0
        });
      }

      setTrendData(composedTrends);

      // 4. Merge & Sort Pending Operations with Currency Detection
      const topups = Array.isArray(topupsRes) ? topupsRes : [];
      const refunds = Array.isArray(refundsRes) ? refundsRes : [];
      
      const mergedOps = [...topups, ...refunds].map(tx => {
        const isUsd = (
          tx.currency === 'USD' ||
          String(tx.payment_method || '').includes('USD') ||
          String(tx.description || '').includes('USD') ||
          String(tx.reference_id || '').startsWith('CRYPTO')
        );

        return {
          id: String(tx.id),
          type: tx.tx_type,
          amount: Math.abs(Number(tx.amount) || 0),
          currency: isUsd ? 'USD' : 'IRT',
          reference_id: tx.reference_id,
          created_at: tx.created_at
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPendingOps(mergedOps.slice(0, 5));

    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  // Formatter for Left Y-Axis: Megabytes to Gigabytes
  const formatDataUsageAxis = (valInMB: number) => {
    if (valInMB >= 1024) {
      return `${(valInMB / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(valInMB)} MB`;
  };

  // Formatter for Right Y-Axis: Values starting from 1,000+ Toman
  const formatCurrencyAxis = (valInToman: number) => {
    if (valInToman >= 1000000) {
      return `${(valInToman / 1000000).toFixed(1)}M T`;
    }
    if (valInToman >= 1000) {
      return `${Math.round(valInToman / 1000)}k T`;
    }
    return `${Math.round(valInToman)} T`;
  };

  // KPI Stat Cards Definition using Separated Currency Figures
  const stats: StatItem[] = [
    { 
      title: 'Total Paid Deposits', 
      value: `${(metrics.total_deposits_irt || 0).toLocaleString()} T`, 
      change: '', 
      trend: 'neutral', 
      icon: DollarSign, 
      subElement: (
        <div className="space-y-0.5 font-mono text-[11px] pt-1 leading-tight w-full">
          <div className="text-emerald-400 font-bold">
            ${(metrics.total_deposits_usd || 0).toFixed(2)} USD
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center space-x-1.5 truncate">
            <span>Frozen:</span>
            <span className={metrics.total_refunds_pending_irt > 0 ? "text-amber-400 font-semibold" : "text-zinc-500"}>
              {(metrics.total_refunds_pending_irt || 0).toLocaleString()} T
            </span>
            <span className="text-zinc-600">·</span>
            <span className={metrics.total_refunds_pending_usd > 0 ? "text-amber-400 font-semibold" : "text-zinc-500"}>
              ${(metrics.total_refunds_pending_usd || 0).toFixed(2)}
            </span>
          </div>
        </div>
      )
    },
    { 
      title: 'Paid Credit Consumed', 
      value: `${(metrics.total_used_value_irt || 0).toLocaleString()} T`, 
      change: '', 
      trend: 'neutral', 
      icon: Activity, 
      subElement: (
        <div className="font-mono text-[11px] pt-1 leading-tight w-full">
          <div className="text-emerald-400 font-bold">
            ${(metrics.total_used_value_usd || 0).toFixed(2)} USD
          </div>
        </div>
      )
    },
    { 
      title: 'System Capacity', 
      value: `${Math.round(metrics.available_capacity).toLocaleString()}`, 
      change: `of ${Math.round(metrics.total_capacity).toLocaleString()} total`, 
      trend: 'neutral', 
      icon: Cpu, 
      subText: 'Available Config Slots' 
    },
    { 
      title: 'Active Wallets', 
      value: `${metrics.total_active_wallets.toLocaleString()}`, 
      change: 'Active', 
      trend: 'up', 
      icon: Users, 
      subText: 'Monitored Client Balances' 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <LayoutDashboard size={20} className="text-emerald-400" />
            <span>Admin Overview</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            System-wide infrastructure telemetry, paid revenue metrics (excluding gift credits), and capacity.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={fetchOverviewData}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin text-emerald-400")} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/servers')}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
          >
            <Plus size={13} />
            <span>Add Server Node</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {stats.map((stat, idx) => (
          <StatCard key={idx} item={stat} />
        ))}
      </div>

      {/* Dual-Axis Analytics Trend Chart */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/40 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>30-Day Platform Bandwidth & Paid Revenue Trends</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Days of the last month usage (horizontal). Left axis: Data usage (MB to GB, Blue). Right axes: Toman deposits (Green line) & USD deposits (Orange line).
            </p>
          </div>

          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
            Past 30 Days
          </span>
        </div>

        {/* Multi-Series Chart with Dual Right Metering (Blue: Bandwidth | Green: Toman | Orange: USD $) */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 12, right: 35, left: 10, bottom: 6 }}>
              <defs>
                <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.20}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorDepositsUSD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.20}/>
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke="#27272a" opacity={0.6} vertical={false} />

              <XAxis 
                dataKey="day" 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={6}
                interval="preserveStartEnd"
              />

              {/* Left Y-Axis: Data usage (MB to GB in Blue) */}
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="#3b82f6"
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatDataUsageAxis}
                domain={[0, 'auto']}
              />

              {/* Right Y-Axis 1: Toman deposits (Green Metering) */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#10b981" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={formatCurrencyAxis}
                width={52}
                domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 10000)]}
              />

              {/* Right Y-Axis 2: USD ($) Vertical Metering with dedicated dollar scaling (Orange) */}
              <YAxis 
                yAxisId="usd"
                orientation="right"
                stroke="#f59e0b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val: number) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(val >= 10 ? 0 : 2)}`}
                width={45}
                domain={[0, (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.35) : 10)]}
              />

              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#09090b', 
                  borderColor: '#27272a', 
                  borderRadius: '0.75rem', 
                  fontSize: '11px', 
                  color: '#f4f4f5' 
                }}
                labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                formatter={(value: any, name: string) => {
                  if (name === "Data Consumed") {
                    return [formatDataUsageAxis(Number(value)), name];
                  }
                  if (name.includes("$") || name.includes("USD")) {
                    return [`$${Number(value).toFixed(2)} USD`, name];
                  }
                  return [`${Number(value).toLocaleString()} Toman`, name];
                }}
              />

              <Legend 
                verticalAlign="top" 
                height={32}
                content={({ payload }) => (
                  <div className="flex flex-wrap items-center justify-end gap-4 text-xs font-medium text-zinc-400 pb-2">
                    {payload?.map((entry: any, index: number) => (
                      <div key={`legend-${index}`} className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span>{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              />

              {/* Blue Area: Bandwidth Data Usage (Left Axis) */}
              <Area 
                yAxisId="left"
                type="monotone" 
                name="Data Consumed" 
                dataKey="data_mb" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorTraffic)" 
              />

              {/* Green Line: Paid Deposits in Toman (Right Axis) */}
              <Area 
                yAxisId="right"
                type="monotone" 
                name="Paid Deposits (Toman)" 
                dataKey="deposits" 
                stroke="#10b981" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorDeposits)" 
              />

              {/* Orange Line/Area: Paid Deposits in USD ($) with dedicated curve & vertical scale */}
              <Area 
                yAxisId="usd"
                type="monotone" 
                name="Paid Deposits ($)" 
                dataKey="deposits_usd" 
                stroke="#f59e0b" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorDepositsUSD)" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-Column Actionable Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Widget 1: Pending Requests (Topups & Refunds) */}
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
              <div className="flex items-center space-x-2">
                <Receipt size={14} className="text-amber-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Pending Approvals</h3>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400">
                {pendingOps.length > 0 ? `${pendingOps.length} Recent` : '0 Pending'}
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500 font-mono">Loading operations...</div>
            ) : pendingOps.length > 0 ? (
              <div className="space-y-2">
                {pendingOps.map((op) => (
                  <div key={op.id} className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-750 transition-colors flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className={cn(
                        "font-semibold text-xs block",
                        op.type === 'Refund' ? "text-rose-400" : "text-emerald-400"
                      )}>
                        {op.type} Request
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center space-x-1.5">
                        <span>{op.reference_id}</span>
                        <span>•</span>
                        <span>{new Date(op.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-xs text-zinc-100">
                        {op.currency === 'USD' ? `$${op.amount.toFixed(2)}` : `${op.amount.toLocaleString()} T`}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/topups')}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Audit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-zinc-700 mb-1" />
                <p className="font-medium text-zinc-400">All Caught Up</p>
                <p className="text-[11px] text-zinc-500">No pending top-ups or refunds.</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between text-xs">
            <span className="text-zinc-500 text-[11px]">Audit and process client payments</span>
            <button
              type="button"
              onClick={() => navigate('/admin/topups')}
              className="text-emerald-400 hover:text-emerald-300 font-medium text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>View All Operations</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Widget 2: Live Server Nodes Telemetry */}
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2.5">
            <div className="flex items-center space-x-2">
              <Server size={14} className="text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Server Telemetry</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/servers')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>View All Nodes</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full py-8 text-center text-xs text-zinc-500 font-mono">Loading nodes...</div>
            ) : servers.length > 0 ? (
              servers.slice(0, 6).map((node, idx) => (
                <div key={node.id || idx} className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-zinc-200 block truncate">{node.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono truncate block">{node.domain_or_ip}:{node.port}</span>
                    </div>
                    
                    {node.is_reachable === false ? (
                      <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border bg-amber-500/10 border-amber-500/30 text-amber-400 shrink-0 cursor-help"
                        title={node.last_error || "Panel unreachable"}
                      >
                        Unreachable
                      </span>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border shrink-0",
                        node.is_active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {node.is_active ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-zinc-850/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>
                      Rate: <strong className="text-zinc-200">{node.price_per_gb.toLocaleString()} T</strong>{' '}
                      <span className="text-emerald-400 font-semibold">(${(node.price_per_gb_usd ?? 0.05).toFixed(2)})</span>
                    </span>
                    <span>Proto: <strong className="text-emerald-400">{node.protocol_type}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-zinc-500">
                No server nodes connected.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Widget 3: System Logs Shortcut */}
      <div className="p-4 rounded-xl bg-zinc-900/20 border border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-zinc-400">
          <Terminal size={15} className="text-emerald-400 shrink-0" />
          <span>Inspect background middleware sync and 3x-ui daemon events.</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/logs')}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap text-xs"
        >
          Open Audit Logs
        </button>
      </div>

    </div>
  );
}

export default AdminOverview;