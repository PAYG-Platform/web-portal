import React from 'react';
import { cn } from './StatCard';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'pending' | 'suspended' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className,
}) => {
  const variantStyles = {
    active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    pending: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    suspended: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    neutral: 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300',
  };

  const dotStyles = {
    active: 'bg-emerald-500',
    pending: 'bg-amber-500',
    suspended: 'bg-rose-500',
    neutral: 'bg-zinc-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0',
        variantStyles[variant],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', dotStyles[variant])} />
      {children}
    </span>
  );
};
