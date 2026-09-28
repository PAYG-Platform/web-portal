import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { StatItem } from '../../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function StatCard({ item }: { item: StatItem; key?: any }) {
  const isWarning = item.isWarning;
  return (
    <div className={cn(
      "min-h-[110px] sm:min-h-[118px] h-auto border rounded-2xl p-3.5 sm:p-4 shadow-xs relative overflow-hidden group flex flex-col justify-between transition-all duration-300 min-w-0",
      isWarning 
        ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60 shadow-amber-950/10" 
        : "bg-zinc-900 border-zinc-800 hover:border-zinc-750"
    )}>
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br transition-opacity duration-500 opacity-0 group-hover:opacity-100",
        isWarning 
          ? "from-amber-500/10 to-transparent" 
          : "from-emerald-500/5 to-transparent"
      )} />
      <div className="flex justify-between items-start relative z-10 w-full min-w-0">
        <div className="min-w-0 pr-2 flex-1">
          <p className={cn("text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate", isWarning ? "text-amber-400/90" : "text-zinc-400")}>
            {item.title}
          </p>
          <h3 className={cn("text-lg sm:text-xl font-bold font-mono mt-0.5 tracking-tight truncate block", isWarning ? "text-amber-200" : "text-zinc-50")}>
            {item.value}
          </h3>
        </div>
        <div className={cn(
          "p-2 rounded-xl border shrink-0 transition-colors",
          isWarning 
            ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
            : "bg-zinc-800/50 border-zinc-700/50 text-emerald-400"
        )}>
          <item.icon size={16} />
        </div>
      </div>
      {item.subElement ? (
        <div className="relative z-10 min-w-0 w-full">
          {item.subElement}
        </div>
      ) : item.subText ? (
        <div className="relative z-10 min-w-0">
          <p className={cn(
            "text-[10px] sm:text-[11px] font-semibold border px-2 py-0.5 rounded-full w-max tracking-wide leading-none truncate max-w-full",
            isWarning || item.subText.includes('Frozen')
              ? "text-amber-300 bg-amber-500/15 border-amber-500/30 font-mono shadow-xs" 
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          )}>
            {item.subText}
          </p>
        </div>
      ) : null}
    </div>
  );
}
