import React from 'react';
import { cn } from './StatCard';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'bg-zinc-950/40 border border-zinc-850 rounded-2xl p-5 shadow-xl transition-all',
        className
      )}
    >
      {children}
    </div>
  );
};
