import React from 'react';
import { cn } from './StatCard';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className,
  ...props
}) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-zinc-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={cn(
            'w-full px-3.5 py-2.5 rounded-xl text-sm bg-zinc-950/60 border border-zinc-800 text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/80',
            icon && 'pl-10',
            error && 'border-rose-500 focus:border-rose-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
};
