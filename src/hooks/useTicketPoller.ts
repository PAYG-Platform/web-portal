// src/hooks/useTicketPoller.ts
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSSEContext } from '../contexts/SSEContext';

export interface GlobalTicketPollResponse {
  ticket: any;
  last_message: any;
}

export function useTicketPoller(
  isAuthenticated: boolean, 
  portalRole: string = 'Client'
) {
  const [updates, setUpdates] = useState<GlobalTicketPollResponse[]>([]);
  const { lastTicketUpdate } = useSSEContext();

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTickets = async () => {
      try {
        const data = await api.get<GlobalTicketPollResponse[]>(
          `/api/support/tickets/updates/poll?portal_role=${portalRole}`
        );

        if (Array.isArray(data)) {
          const sorted = data.sort((a, b) => {
            if (!a?.ticket || !b?.ticket) return 0;
            if (a.ticket.has_unseen_messages && !b.ticket.has_unseen_messages) return -1;
            if (!a.ticket.has_unseen_messages && b.ticket.has_unseen_messages) return 1;
            return new Date(b.ticket.updated_at || 0).getTime() - new Date(a.ticket.updated_at || 0).getTime();
          });

          setUpdates(sorted);
        } else {
          setUpdates([]);
        }
      } catch {
        // Handled silently
      }
    };

    fetchTickets();

    const interval = setInterval(fetchTickets, 25000);
    return () => clearInterval(interval);

  }, [isAuthenticated, lastTicketUpdate, portalRole]);

  return { updates };
}