// src/pages/SupportTickets.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Headset, Paperclip, Send, 
  ChevronLeft, X, 
  Sparkles, XCircle, RefreshCw, 
  Play, Maximize2, AlertCircle, Check
} from 'lucide-react';
import { cn } from '../components/ui/StatCard';
import { api, getMediaUrl } from '../services/api';
import { clientService } from '../services/clientService';
import { useAuth } from '../hooks/useAuth';
import { useTicketPoller } from '../hooks/useTicketPoller';
import { useSSEContext } from '../contexts/SSEContext';

export interface MessageAttachment {
  name: string;
  size: string;
  type: 'text' | 'image' | 'pdf' | 'log' | 'code';
  previewContent?: string;
  url?: string;
}

export interface Message {
  id: string;
  sender: 'Admin' | 'Seller' | 'Client';
  senderName: string;
  text: string;
  timestamp: string;
  attachment?: MessageAttachment;
}

export interface AdminTicket {
  id: string;
  sellerName: string;
  sellerId: string;
  subject: string;
  category: string;
  status: 'Open' | 'Pending' | 'Closed' | 'In Progress' | 'Done';
  lastMessageTime: string;
  userType: 'Seller' | 'Client';
  messages: Message[];
  has_unseen_messages?: boolean;
  updated_at?: string;
}

const QUICK_TEMPLATES = [
  { 
    label: '⚡ Server IP Updated', 
    text: 'The server IP has been updated in our core routing panel. Please flush your local DNS cache and test user bandwidth synchronization again.' 
  },
  { 
    label: '⚡ Under Investigation', 
    text: 'We have received your diagnostic report and our NOC engineering team is currently analyzing the node trace logs.' 
  },
  { 
    label: '⚡ Issue Resolved', 
    text: 'The reported API synchronization issue has been resolved. All 3x-ui database locks have been cleared and services are fully operational.' 
  },
  { 
    label: '⚡ Gateway Maintenance', 
    text: 'Crypto TRC-20 and SWIFT wire settlements were briefly delayed for scheduled gateway maintenance. Payouts are processing now.' 
  },
  { 
    label: '⚡ Request Traceroute Logs', 
    text: 'Please run a traceroute command targeting the node IP and attach the diagnostic log file here so we can analyze the packet hop.' 
  },
];

const isMediaVideo = (url: string) => /\.(mp4|webm|mov|mkv|avi)($|\?)/i.test(url);

const MessageMediaAttachment = ({ 
  url, 
  onOpenLightbox 
}: { 
  url: string; 
  onOpenLightbox: (url: string) => void; 
}) => {
  const [hasError, setHasError] = useState(false);
  const fullUrl = getMediaUrl(url);
  const isVideo = isMediaVideo(url);

  if (hasError) {
    return (
      <div className="mt-2 p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1 text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span className="font-semibold text-zinc-300">Media unavailable</span>
        </div>
        <a 
          href={fullUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
        >
          <span>Open Direct Link</span>
        </a>
      </div>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 w-full max-w-xs sm:max-w-sm">
      {isVideo ? (
        <div className="relative group cursor-pointer" onClick={() => onOpenLightbox(url)}>
          <video 
            src={fullUrl} 
            playsInline
            muted
            preload="metadata"
            className="max-h-48 w-full object-cover rounded-xl"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
            <Play size={24} className="text-white fill-white" />
          </div>
        </div>
      ) : (
        <div className="relative group cursor-pointer overflow-hidden min-h-[90px] bg-zinc-950 flex items-center justify-center" onClick={() => onOpenLightbox(url)}>
          <img 
            src={fullUrl} 
            alt="Attachment" 
            className="max-h-48 w-full object-cover rounded-xl transition-transform group-hover:scale-105"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 size={16} className="text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

const compressImageFile = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/') || file.size < 1024 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export function SupportTickets() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { triggerTicketUpdate } = useSSEContext();

  // Real API State
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat Input & Attachments
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Pending' | 'Closed'>('All');
  
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mediaLightboxUrl, setMediaLightboxUrl] = useState<string | null>(null);

  // Pagination & Loading States for Chat History
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Background Polling Hook
  const { updates } = useTicketPoller(isAuthenticated, 'Admin');

  const activeTicket = tickets.find(t => t && t.id === selectedTicketId) || null;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Real Tickets from Support Service (All Tickets)
  const fetchTickets = async () => {
    try {
      const res = await api.get<any>('/api/support/tickets/?portal_role=Admin&limit=100');
      const ticketList = Array.isArray(res) ? res : (res?.items || []);

      const mapped: AdminTicket[] = ticketList.map((t: any) => {
        const isClient = t.creator_role === 'Client';
        return {
          id: String(t.id),
          sellerName: isClient ? 'Client User' : 'Reseller Partner',
          sellerId: t.seller_id ? String(t.seller_id) : '',
          subject: t.subject || 'No Subject',
          category: t.category || 'General',
          status: t.status || 'Open',
          lastMessageTime: t.updated_at ? new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          userType: isClient ? 'Client' : 'Seller',
          has_unseen_messages: t.has_unseen_messages || false,
          updated_at: t.updated_at,
          messages: []
        };
      });

      setTickets(mapped);
    } catch (err) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Active Ticket Message Thread Details (Does NOT trigger global state events to avoid loops)
  const fetchActiveTicketDetail = async (ticketId: string) => {
    try {
      const t = await api.get<any>(`/api/support/tickets/${ticketId}?portal_role=Admin`);
      if (!t) return;

      const updatedMessages: Message[] = (t.messages || []).map((m: any) => ({
        id: String(m.id),
        sender: m.sender_role || 'Client',
        senderName: m.sender_role === 'Admin' ? 'Super Admin' : (m.sender_role || 'User'),
        text: m.content || '',
        timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        ...(m.attachment_url && {
          attachment: {
            name: typeof m.attachment_url === 'string' ? (m.attachment_url.split('/').pop() || 'attachment') : 'attachment',
            size: 'File',
            type: 'image',
            url: String(m.attachment_url)
          }
        })
      }));

      setTickets(prev => prev.map(item => {
        if (item && item.id === ticketId) {
          return {
            ...item,
            status: t.status || item.status,
            messages: updatedMessages,
            has_unseen_messages: false
          };
        }
        return item;
      }));

    } catch (err) {
      // Handled silently
    }
  };

  // Sync background polling updates
  useEffect(() => {
    if (Array.isArray(updates) && updates.length > 0) {
      setTickets(prevTickets => {
        const newTickets = [...prevTickets];
        updates.forEach(update => {
          if (!update || !update.ticket || !update.ticket.id) return;

          const idx = newTickets.findIndex(t => t && t.id === String(update.ticket.id));
          const isClient = update.ticket.creator_role === 'Client';

          const mappedTicket: Partial<AdminTicket> = {
            id: String(update.ticket.id),
            sellerName: isClient ? 'Client User' : 'Reseller Partner',
            sellerId: update.ticket.seller_id ? String(update.ticket.seller_id) : '',
            subject: update.ticket.subject || 'No Subject',
            category: update.ticket.category || 'General',
            status: update.ticket.status || 'Open',
            lastMessageTime: update.ticket.updated_at ? new Date(update.ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            userType: isClient ? 'Client' : 'Seller',
            has_unseen_messages: update.ticket.has_unseen_messages || false,
            updated_at: update.ticket.updated_at
          };

          if (idx !== -1) {
            newTickets[idx] = { ...newTickets[idx], ...mappedTicket } as AdminTicket;
          } else {
            newTickets.push({ ...mappedTicket, messages: [] } as AdminTicket);
          }
        });

        return newTickets.sort((a, b) => {
          if (!a || !b) return 0;
          if (a.has_unseen_messages && !b.has_unseen_messages) return -1;
          if (!a.has_unseen_messages && b.has_unseen_messages) return 1;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        });
      });

      // ONLY re-fetch active details if there is an unread update or new message
      if (selectedTicketId) {
        const activeUpdate = updates.find(u => u && u.ticket && String(u.ticket.id) === selectedTicketId);
        if (activeUpdate && (activeUpdate.ticket.has_unseen_messages || activeUpdate.last_message)) {
          fetchActiveTicketDetail(selectedTicketId);
        }
      }
    }
  }, [updates]);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      setHasMoreMessages(true);
      fetchActiveTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    if (!loadingMore) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages, mobileView]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMoreMessages && !loadingMore && selectedTicketId) {
      setLoadingMore(true);
      try {
        const currentCount = activeTicket?.messages?.length || 0;
        const res = await api.get<any[]>(`/api/support/tickets/${selectedTicketId}/messages?offset=${currentCount}&limit=20&portal_role=Admin`);
        if (!Array.isArray(res) || res.length < 20) setHasMoreMessages(false);
        if (Array.isArray(res) && res.length > 0) {
          const olderMessages: Message[] = res.map((m: any) => ({
            id: String(m.id),
            sender: m.sender_role || 'Client',
            senderName: m.sender_role === 'Admin' ? 'Super Admin' : (m.sender_role || 'User'),
            text: m.content || '',
            timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            ...(m.attachment_url && {
              attachment: {
                name: typeof m.attachment_url === 'string' ? (m.attachment_url.split('/').pop() || 'attachment') : 'attachment',
                size: 'File',
                type: 'image',
                url: String(m.attachment_url)
              }
            })
          }));

          const scrollHeightBefore = chatContainerRef.current?.scrollHeight || 0;

          setTickets(prev => prev.map(t => {
            if (t && t.id === selectedTicketId) {
              const existingIds = new Set((t.messages || []).map(m => m.id));
              const uniqueOlder = olderMessages.filter(m => !existingIds.has(m.id));
              return { ...t, messages: [...uniqueOlder, ...(t.messages || [])] };
            }
            return t;
          }));

          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight - scrollHeightBefore;
            }
          }, 0);
        }
      } catch (err) {
        // Handled silently
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleProcessConnectionInTicket = async (action: 'Approve' | 'Reject') => {
    if (!selectedTicketId) return;

    try {
      const updatedTicketDetail: any = await clientService.processTicketConnection(selectedTicketId, action);
      showToast(`Connection request ${action === 'Approve' ? 'Accepted' : 'Declined'}`);
      
      if (updatedTicketDetail && updatedTicketDetail.messages) {
        const mappedMessages = (updatedTicketDetail.messages || []).map((m: any) => ({
          id: String(m.id),
          sender: m.sender_role || 'Client',
          senderName: m.sender_role === 'Admin' ? 'You' : m.sender_role === 'Client' ? 'Client' : 'Reseller',
          text: m.content || '',
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          ...(m.attachment_url && {
            attachment: {
              name: typeof m.attachment_url === 'string' ? (m.attachment_url.split('/').pop() || 'attachment') : 'attachment',
              size: 'File',
              type: 'image',
              url: String(m.attachment_url)
            }
          })
        }));

        setTickets(prev => prev.map(t => {
          if (t && t.id === selectedTicketId) {
            return {
              ...t,
              status: updatedTicketDetail.status || 'Closed',
              messages: mappedMessages
            };
          }
          return t;
        }));
      }

      await fetchTickets();
      triggerTicketUpdate();
    } catch (err: any) {
      showToast(err.message || 'Error processing connection request.');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: 'Open' | 'Pending' | 'Closed') => {
    const formData = new FormData();
    formData.append('status', newStatus);

    try {
      await api.patch(`/api/support/tickets/${ticketId}/status`, formData, { headers: {} });
      showToast(`Ticket #${ticketId} status changed to ${newStatus}`);
      await fetchActiveTicketDetail(ticketId);
      await fetchTickets();
      triggerTicketUpdate();
    } catch (err: any) {
      showToast(err.message || 'Could not update status.');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTicketId || (!replyText.trim() && !attachedFile)) return;

    const formData = new FormData();
    formData.append('portal_role', 'Admin');
    if (replyText.trim()) formData.append('content', replyText.trim());
    if (attachedFile) {
      const processedFile = await compressImageFile(attachedFile);
      formData.append('file', processedFile);
    }

    try {
      await api.post(`/api/support/tickets/${selectedTicketId}/messages`, formData, { headers: {} });
      setReplyText('');
      setAttachedFile(null);
      await fetchActiveTicketDetail(selectedTicketId);
      triggerTicketUpdate();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reply.');
    }
  };

  const handleApplyTemplate = (templateText: string) => {
    setReplyText(templateText);
    showToast("Canned response loaded into input");
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!ticket) return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (ticket.sellerName || '').toLowerCase().includes(q) ||
      (ticket.subject || '').toLowerCase().includes(q) ||
      (ticket.id || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-zinc-950 overflow-hidden font-sans">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in",
          "bg-zinc-950 border-emerald-500/30 text-emerald-400"
        )}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Two-Column Workspace Container */}
      <div className="flex-1 min-h-0 flex divide-x divide-zinc-800/40">
        
        {/* ================= COLUMN 1: TICKET LIST ================= */}
        <div className={cn(
          "w-full lg:w-80 xl:w-96 flex flex-col shrink-0 h-full min-h-0 bg-zinc-950/40",
          mobileView === 'list' ? "flex" : "hidden lg:flex"
        )}>
          
          {/* Header */}
          <div className="p-3.5 border-b border-zinc-800/40 space-y-2 bg-zinc-950 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Headset size={16} className="text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">Admin Helpdesk</h2>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                {filteredTickets.filter(t => t && t.status === 'Open').length} Open
              </span>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="p-3 border-b border-zinc-800/40 space-y-2 bg-zinc-950/20">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search subject or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-900/80 text-xs text-zinc-100 outline-none focus:border-zinc-700 border border-zinc-800 transition-colors placeholder:text-zinc-600 h-8"
              />
            </div>

            {/* Status Pills */}
            <div className="grid grid-cols-4 gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/60 text-[10px] font-medium">
              {(['All', 'Open', 'Pending', 'Closed'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "py-1 rounded-md transition-colors text-center cursor-pointer",
                    statusFilter === st ? "bg-zinc-850 text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/20">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono">Loading tickets...</div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((ticket) => {
                const isActive = ticket.id === activeTicket?.id;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      setMobileView('chat');
                    }}
                    className={cn(
                      "w-full text-left p-3.5 transition-colors flex flex-col space-y-1.5 relative cursor-pointer group",
                      isActive 
                        ? "bg-zinc-900/70 text-zinc-100" 
                        : "hover:bg-zinc-900/30 text-zinc-400"
                    )}
                  >
                    {/* Top Row: Unseen Dot + Title + Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {ticket.has_unseen_messages && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                        <h4 className={cn(
                          "font-semibold text-xs leading-snug truncate transition-colors",
                          isActive ? "text-zinc-100" : (ticket.has_unseen_messages ? "text-emerald-300" : "text-zinc-300 group-hover:text-zinc-100")
                        )}>
                          {ticket.subject}
                        </h4>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">{ticket.lastMessageTime}</span>
                    </div>

                    {/* Bottom Row: Category Badge & Role Badge */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                      <span className="text-[9px] bg-zinc-950 border border-zinc-855 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                        {ticket.category}
                      </span>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase tracking-wider border shrink-0",
                        ticket.userType === 'Client' ? "bg-teal-500/10 text-teal-400 border-teal-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      )}>
                        {ticket.userType}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-zinc-600 text-xs">
                No support tickets found.
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUMN 2: CONVERSATION VIEW ================= */}
        <div className={cn(
          "flex-1 flex min-w-0 h-full min-h-0 bg-[#09090b]",
          mobileView === 'chat' ? "flex" : "hidden lg:flex"
        )}>
          {activeTicket ? (
            <div className="flex-1 flex flex-col min-w-0 h-full min-h-0">
              
              {/* Ticket Top Header Bar */}
              <div className="px-4 py-3 border-b border-zinc-800/40 bg-zinc-950 flex justify-between items-center min-h-[52px] shrink-0">
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="lg:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                    title="Back to Tickets"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 text-xs font-semibold">
                      <span className="text-emerald-400 font-bold">{activeTicket.category}</span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100 truncate tracking-tight">{activeTicket.subject}</h4>
                  </div>
                </div>

                {/* Right Controls: Status & Close */}
                <div className="flex items-center space-x-2 shrink-0 pl-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border bg-zinc-950",
                    activeTicket.status === 'Open' ? "border-emerald-500/20 text-emerald-400" :
                    activeTicket.status === 'Pending' ? "border-amber-500/20 text-amber-400" :
                    "border-zinc-750 text-zinc-400"
                  )}>
                    <span className={cn(
                      "w-1 h-1 rounded-full mr-1.5",
                      activeTicket.status === 'Open' ? "bg-emerald-500" :
                      activeTicket.status === 'Pending' ? "bg-amber-500" :
                      "bg-zinc-500"
                    )} />
                    {activeTicket.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(activeTicket.id, 'Closed')}
                    disabled={activeTicket.status === 'Closed' || activeTicket.status === 'Done'}
                    className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <XCircle size={13} />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Connection Request Action Banner */}
              {activeTicket.category === 'Seller Connection Request' && activeTicket.status === 'Pending' && (
                <div className="py-2 px-4 bg-zinc-900/90 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Sparkles size={14} className="text-emerald-400 shrink-0" />
                    <p className="text-xs text-zinc-300 font-medium truncate">
                      Client connection request awaiting approval.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleProcessConnectionInTicket('Reject')}
                      className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-rose-400 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Decline
                    </button>

                    <button
                      type="button"
                      onClick={() => handleProcessConnectionInTicket('Approve')}
                      className="px-3 py-1 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              )}

              {/* Messages Thread Container */}
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-950/40"
              >
                {loadingMore && (
                  <div className="w-full flex justify-center py-2">
                    <RefreshCw size={14} className="animate-spin text-zinc-500" />
                  </div>
                )}

                {(activeTicket.messages || []).map(msg => {
                  const isAdmin = msg.sender === 'Admin';
                  const isSeller = msg.sender === 'Seller';

                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1",
                        isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className="flex items-center space-x-1.5 text-[10px] text-zinc-500 px-1">
                        <span className={cn(
                          "font-semibold",
                          isAdmin ? "text-emerald-400" : isSeller ? "text-purple-400" : "text-teal-400"
                        )}>
                          {msg.senderName}
                        </span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl text-xs sm:text-sm leading-relaxed border shadow-xs",
                        isAdmin 
                          ? "bg-zinc-800 text-zinc-100 border-zinc-700/60 rounded-tr-xs"
                          : isSeller
                            ? "bg-zinc-900/90 text-zinc-200 border-zinc-800/80 rounded-tl-xs"
                            : "bg-zinc-900/60 text-zinc-200 border-zinc-800/60 rounded-tl-xs"
                      )}>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                        {msg.attachment && msg.attachment.url && (
                          <MessageMediaAttachment 
                            url={msg.attachment.url} 
                            onOpenLightbox={(url) => setMediaLightboxUrl(url)} 
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Template Pills Bar */}
              <div className="px-4 py-2 border-t border-zinc-800/40 bg-zinc-950 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                <span className="text-[10px] font-semibold text-zinc-500 shrink-0 uppercase tracking-wider mr-1">Canned:</span>
                {QUICK_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.text)}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-2 py-0.5 rounded-md whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendMessage} className="p-3.5 border-t border-zinc-800/40 bg-zinc-950 flex items-center space-x-2 shrink-0">
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachedFile(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Attach Media File"
                >
                  <Paperclip size={15} />
                </button>

                <input 
                  type="text" 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={activeTicket.status === 'Closed' ? "Ticket closed." : "Type reply to user..."}
                  disabled={activeTicket.status === 'Closed'}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors disabled:opacity-40 h-9"
                />

                <button 
                  type="submit"
                  disabled={!replyText.trim() && !attachedFile}
                  className="p-2 bg-zinc-100 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
              <Headset size={28} className="text-zinc-700" />
              <p className="text-xs">Select a ticket from the left column to view the conversation.</p>
            </div>
          )}
        </div>

      </div>

      {/* Fullscreen Media Lightbox Modal */}
      {mediaLightboxUrl && (
        <div 
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setMediaLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setMediaLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-full cursor-pointer hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="max-w-3xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {isMediaVideo(mediaLightboxUrl) ? (
              <video src={getMediaUrl(mediaLightboxUrl)} controls autoPlay playsInline className="max-w-full max-h-[80vh] w-auto h-auto rounded-xl shadow-2xl" />
            ) : (
              <img src={getMediaUrl(mediaLightboxUrl)} alt="Fullscreen Preview" className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-xl shadow-2xl" />
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default SupportTickets;