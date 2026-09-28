// src/hooks/useAdminPendingApprovals.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSSEContext } from '../contexts/SSEContext';

export function useAdminPendingApprovals(isAuthenticated: boolean, role: string) {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const { lastTopupUpdate } = useSSEContext();

  const fetchPendingCounts = useCallback(async () => {
    if (!isAuthenticated || role !== 'Admin') return;
    try {
      const [topupsRes, refundsRes] = await Promise.all([
        api.get<any[]>('/api/billing/topups/pending').catch(() => []),
        api.get<any[]>('/api/billing/refunds/pending').catch(() => [])
      ]);

      const allPendingIds = [
        ...(Array.isArray(topupsRes) ? topupsRes : []),
        ...(Array.isArray(refundsRes) ? refundsRes : [])
      ].map(p => String(p.id));

      if (allPendingIds.length === 0) {
        setPendingCount(0);
        return;
      }

      const checkedIds: string[] = JSON.parse(localStorage.getItem('admin_checked_pending_ids') || '[]');
      const uncheckedCount = allPendingIds.filter(id => !checkedIds.includes(id)).length;
      setPendingCount(uncheckedCount);
    } catch {
      setPendingCount(0);
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    fetchPendingCounts();
  }, [fetchPendingCounts, lastTopupUpdate]);

  useEffect(() => {
    if (!isAuthenticated || role !== 'Admin') return;
    const interval = setInterval(fetchPendingCounts, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, role, fetchPendingCounts]);

  return { pendingCount, fetchPendingCounts };
}