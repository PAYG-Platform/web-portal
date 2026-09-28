import React from 'react';
import { cn } from './StatCard';

export interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, label }) => {
  return (
    <label className="flex items-center space-x-3 cursor-pointer">
      <div
        onClick={() => onChange(!enabled)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative p-0.5 border',
          enabled ? 'bg-emerald-500 border-emerald-400' : 'bg-zinc-800 border-zinc-700'
        )}
      >
        <div
          className={cn(
            'w-4 h-4 rounded-full bg-zinc-950 transition-transform shadow-md',
            enabled ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
      {label && <span className="text-xs font-semibold text-zinc-300">{label}</span>}
    </label>
  );
};
