import React from 'react';

export type Role = 'Admin' | 'Client';

export interface StatItem {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  subText?: string;
  subElement?: React.ReactNode;
  isWarning?: boolean;
}
