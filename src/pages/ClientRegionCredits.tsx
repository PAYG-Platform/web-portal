// src/pages/ClientRegionCredits.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, RefreshCw, Plus, CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../components/ui/StatCard';

interface BucketItem {
  id: string;
  bucket_type: 'GIFT' | 'FIAT' | 'CRYPTO';
  priority?: number;
  location_id?: string;
  location_name?: string;
  balance: number;
  empty_since?: string;
  is_active: boolean;
}

interface LocationItem {
  id: string;
  name: string;
  country_code: string;
  flag: string;
}

export function ClientRegionCredits() {
  const navigate = useNavigate();

  const [buckets, setBuckets] = useState<BucketItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, locsRes] = await Promise.all([
        api.get<any>('/api/billing/topups/balance').catch(() => null),
        api.get<LocationItem[]>('/api/node/servers/locations').catch(() => [])
      ]);

      if (balRes) {
        setTotalBalance(balRes.total_balance || 0);
        setBuckets(Array.isArray(balRes.buckets) ? balRes.buckets : []);
      } else {
        setTotalBalance(0);
        setBuckets([]);
      }

      if (Array.isArray(locsRes)) {
        setLocations(locsRes);
      }
    } catch {
      setBuckets([]);
      showToast('Could not load regional balance allocations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getLocationInfo = (bucket: BucketItem) => {
    if (bucket.location_id) {
      const foundLoc = locations.find(l => l.id === bucket.location_id);
      if (foundLoc) {
        return {
          flag: foundLoc.flag,
          name: foundLoc.name,
          code: foundLoc.country_code
        };
      }
    }

    if (bucket.bucket_type === 'GIFT') {
      return { flag: '🎁', name: 'Gift Credit (All Regions)', code: 'PROMO' };
    }
    if (bucket.bucket_type === 'CRYPTO') {
      return { flag: '🪙', name: 'Platform Crypto (Global)', code: 'USDT' };
    }

    return {
      flag: '🌐',
      name: bucket.location_name || 'Primary Region',
      code: 'DEFAULT'
    };
  };

  const regionalFiatBuckets = buckets.filter(b => b.bucket_type === 'FIAT');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 pb-16 font-sans">
      
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
            <Globe size={20} className="text-emerald-400" />
            <span>Regional Balance Allocations</span>
          </h2>
          <p className="text-xs text-zinc-400 font-normal mt-0.5">
            Monitor balances available for your active server locations.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Refresh Balances"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin text-emerald-400")} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/client/wallet')}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Top-Up Wallet</span>
          </button>
        </div>
      </div>

      {/* Regional Credits Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-500 font-mono">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw size={13} className="animate-spin text-emerald-400" />
            <span>Loading regional balances...</span>
          </div>
        </div>
      ) : regionalFiatBuckets.length > 0 ? (
        <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Active Regional Allocations ({regionalFiatBuckets.length})
            </h3>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {totalBalance.toLocaleString()} T Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regionalFiatBuckets.map((bucket) => {
              const locInfo = getLocationInfo(bucket);

              return (
                <div
                  key={bucket.id}
                  className="rounded-xl bg-zinc-950/60 border border-zinc-800/60 p-3.5 flex flex-col justify-between space-y-3 hover:border-zinc-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-xl select-none shrink-0">{locInfo.flag}</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{locInfo.name}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono block truncate">{locInfo.code}</span>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[9px] font-mono rounded uppercase font-semibold border shrink-0",
                        bucket.balance > 0
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-855 text-zinc-500 border-zinc-800"
                      )}
                    >
                      {bucket.balance > 0 ? 'Active' : 'Empty'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-between">
                    <div className="font-mono">
                      <span className="text-xs font-bold text-zinc-100">{bucket.balance.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500 font-sans ml-1">T</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/20 border border-dashed border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-400">No regional credit allocations found.</p>
          <button
            type="button"
            onClick={() => navigate('/client/wallet')}
            className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Top-up Wallet</span>
          </button>
        </div>
      )}

    </div>
  );
}

export default ClientRegionCredits;