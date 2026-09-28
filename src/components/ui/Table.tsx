import React from 'react';
import { cn } from './StatCard';

export interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ headers, children, className }) => {
  return (
    <div className={cn('overflow-x-auto border border-zinc-850 rounded-2xl bg-zinc-950/40', className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-850 text-zinc-400 text-[10px] font-bold uppercase tracking-wider bg-zinc-950/60">
            {headers.map((h, idx) => (
              <th key={idx} className="py-3.5 px-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-850/50">{children}</tbody>
      </table>
    </div>
  );
};
