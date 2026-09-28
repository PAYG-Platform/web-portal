import React from 'react';
import { cn } from './StatCard';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/10',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700',
    outline: 'border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/30',
    danger: 'bg-rose-500 hover:bg-rose-400 text-zinc-950 shadow-md shadow-rose-500/10',
    ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs space-x-1.5',
    md: 'px-4 py-2 text-xs sm:text-sm space-x-2',
    lg: 'px-6 py-3 text-sm space-x-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
