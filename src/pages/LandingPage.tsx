// src/pages/LandingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Gift, Zap, ArrowRight, Globe, 
  ChevronRight, Radio, Sun, Moon, Lock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../components/ui/StatCard';

interface SanitizedLocation {
  name: string;
  country_code: string;
  flag: string;
  status: 'Available' | 'High Demand' | 'Maintenance' | string;
  base_rate_display: string;
  base_rate_usd_display?: string;
}

interface PublicPricing {
  signup_gift_credit: number;
  signup_gift_credit_usd?: number;
  min_topup_amount: number;
  min_topup_amount_usd?: number;
  billing_model: string;
  currency: string;
}

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [locations, setLocations] = useState<SanitizedLocation[]>([]);
  const [pricing, setPricing] = useState<PublicPricing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [locRes, priceRes] = await Promise.all([
          api.get<SanitizedLocation[]>('/api/node/servers/locations-public').catch(() => []),
          api.get<PublicPricing>('/api/billing/settings/public-pricing').catch(() => null)
        ]);

        if (Array.isArray(locRes)) setLocations(locRes);
        if (priceRes) setPricing(priceRes);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  const signupGift = pricing?.signup_gift_credit ?? 20000;
  const signupGiftUsd = pricing?.signup_gift_credit_usd ?? 0.50;
  const minTopup = pricing?.min_topup_amount ?? 50000;
  const minTopupUsd = pricing?.min_topup_amount_usd ?? 2.00;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400 transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-900/80 border-b border-zinc-800 h-16 flex items-center px-4 sm:px-8 justify-between shadow-xs">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center shadow-xs">
            <Shield size={18} />
          </div>
          <span className="text-base font-extrabold tracking-tight text-zinc-100">PAYG VPN</span>
        </div>

        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent transition-colors cursor-pointer"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate(role === 'Admin' ? '/admin' : '/client')}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>Dashboard</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/80 border border-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Log In
              </button>

              <button
                type="button"
                onClick={() => navigate('/login?mode=signup')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer shadow-xs shadow-emerald-500/10 flex items-center space-x-1"
              >
                <span>Sign Up</span>
                <ChevronRight size={13} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        {/* Guard / Shield Logo */}
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-zinc-900/90 border border-emerald-500/30 text-emerald-400 shadow-2xl shadow-emerald-500/15">
            <Shield className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-50 max-w-3xl mx-auto leading-tight sm:leading-none">
        PAYG VPN <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Pay For What You Use.
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-xl mx-auto leading-relaxed">
          Zero monthly expiration. Deposit once, use your bandwidth whenever you need it.
        </p>

        {/* Welcome Gift Card */}
        <div className="max-w-md mx-auto pt-2">
          {signupGift > 0 || signupGiftUsd > 0 ? (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-zinc-900/40 border border-emerald-500/30 text-left space-y-2 relative overflow-hidden shadow-lg shadow-emerald-500/5">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Gift size={18} className="shrink-0" />
                <h2 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                  {signupGift.toLocaleString()} Toman {signupGiftUsd > 0 ? `($${signupGiftUsd < 1 ? signupGiftUsd.toFixed(2) : signupGiftUsd} USD)` : ''} Free Welcome Credit
                </h2>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                Register today and get an instant non-refundable credit of{' '}
                <strong className="text-emerald-400 font-bold">
                  {signupGift.toLocaleString()} Toman {signupGiftUsd > 0 ? `($${signupGiftUsd < 1 ? signupGiftUsd.toFixed(2) : signupGiftUsd} USD)` : ''}
                </strong>{' '}
                added to your wallet automatically based on your chosen billing zone. Test any server location immediately with zero upfront deposit.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-300 text-center">
              Flexible top-ups starting from only{' '}
              <strong className="text-emerald-400 font-semibold">
                {minTopup.toLocaleString()} Toman {minTopupUsd > 0 ? `($${minTopupUsd < 1 ? minTopupUsd.toFixed(2) : minTopupUsd} USD)` : ''}
              </strong>.
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? (role === 'Admin' ? '/admin' : '/client') : '/login?mode=signup')}
            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2 cursor-pointer active:scale-[0.99]"
          >
            <span>{isAuthenticated ? "Enter Dashboard" : "Claim Free Credit"}</span>
            <ArrowRight size={15} />
          </button>

          <a
            href="#regions"
            className="px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Explore Locations & Rates
          </a>
        </div>
      </section>

      {/* ZERO-LEAKAGE REGIONAL OVERVIEW */}
      <section id="regions" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-zinc-800/40 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Globe size={18} className="text-emerald-400" />
              <span>Supported Server Locations</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Direct routes optimized for circumvention. Rates billed purely per gigabyte consumed.
            </p>
          </div>

          <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {locations.length} Active Region(s)
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500 font-mono">
            Loading supported regions...
          </div>
        ) : locations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {locations.map((loc, idx) => {
              const isAvailable = loc.status === "Available";

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-zinc-900/30 border border-zinc-800/60 p-4 flex flex-col justify-between space-y-3.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-2xl select-none shrink-0" title={loc.name}>
                          {loc.flag}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-zinc-100 truncate">{loc.name}</h3>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase block">
                            {loc.country_code}
                          </span>
                        </div>
                      </div>

                      {/* OpSec Safe Status (NO server counts or slot numbers) */}
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase border shrink-0",
                        isAvailable 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-zinc-850 border-zinc-800 text-zinc-500"
                      )}>
                        <span className={cn(
                          "w-1 h-1 rounded-full mr-1.5",
                          isAvailable ? "bg-emerald-500" : "bg-zinc-600"
                        )} />
                        {loc.status}
                      </span>
                    </div>

                    {/* Regional Rate Tier Display (Dual Currency: Toman & USD) */}
                    <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-[11px] text-zinc-400 font-sans">Bandwidth Rate:</span>
                      <div className="text-right font-mono">
                        <span className="text-zinc-100 font-bold block">{loc.base_rate_display}</span>
                        <span className="text-emerald-400 font-semibold text-[11px] block mt-0.5">
                          {loc.base_rate_usd_display || "From ~$0.05 / GB"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-850/60 flex items-center justify-end text-[10px] text-zinc-400 font-mono">
                    <span className={isAvailable ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                      {isAvailable ? "Operational" : "Maintenance"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-500 rounded-2xl bg-zinc-900/20 border border-dashed border-zinc-800">
            No regional routes currently listed. Check back shortly.
          </div>
        )}
      </section>

      {/* Core Features Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-850 border border-zinc-800 text-emerald-400 flex items-center justify-center mb-2">
              <Zap size={14} />
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Waterfall Balance Engine</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              Promotional gift credits are deducted first, protecting your real deposit capital.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-850 border border-zinc-800 text-emerald-400 flex items-center justify-center mb-2">
              <Radio size={14} />
            </div>
            <h4 className="text-xs font-bold text-zinc-100">Single Universal Link</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              One subscription URL that auto-syncs when routes or IPs are replaced.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 mt-12 py-6 text-center text-xs text-zinc-500 max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
        <p>© {new Date().getFullYear()} PAYG VPN Platform. All rights reserved.</p>
        <div className="flex items-center space-x-3">
          <button type="button" onClick={() => navigate('/login')} className="hover:text-zinc-300">Log In</button>
          <span>•</span>
          <button type="button" onClick={() => navigate('/login?mode=signup')} className="hover:text-zinc-300">Sign Up</button>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;