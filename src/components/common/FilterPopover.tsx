import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';

export interface FilterPopoverProps {
  onFilterChange?: (filters: any) => void;
  options?: { label: string; value: string }[];
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({ onFilterChange, options = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const handleSelect = (val: string) => {
    setSelectedFilter(val);
    if (onFilterChange) onFilterChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
      >
        <Filter size={14} className="text-emerald-400" />
        <span>Filters</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-850">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Filter Options</span>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-200">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleSelect('all')}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'all' ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              All Records
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedFilter === opt.value ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
