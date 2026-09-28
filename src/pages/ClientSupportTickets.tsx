// vpn-payg-frontend/src/pages/ClientSupportTickets.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Headset, Send, Paperclip, ChevronLeft, X,
  AlertCircle, MessageSquare, Plus, HelpCircle,
  Search, Terminal, RefreshCw,
  Server, ArrowRight, ExternalLink, XCircle, Maximize2, Play
} from 'lucide-react';
import { cn } from '../components/ui/StatCard';
import { api, getMediaUrl } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useTicketPoller } from '../hooks/useTicketPoller';
import { useSSEContext } from '../contexts/SSEContext';

export interface Attachment {
  name: string;
  size: string;
  type: 'log' | 'image' | 'pdf' | 'text';
  previewContent?: string;
  url?: string;
}

export interface TicketMessage {
  id: string;
  sender: 'Client' | 'Admin';
  senderName: string;
  text: string;
  timestamp: string;
  attachment?: Attachment;
}

export interface ClientTicket {
  id: string;
  subject: string;
  category: string;
  status: 'Open' | 'Pending' | 'Closed' | 'In Progress' | 'Done';
  lastMessageTime: string;
  relatedServer?: string;
  messages: TicketMessage[];
  has_unseen_messages?: boolean;
  updated_at?: string;
}

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
          <span>Open Direct Media Link</span>
          <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 w-full max-w-xs sm:max-w-sm">
      {isVideo ? (
        <div className="relative group cursor-pointer" onClick={() => onOpenLightbox(url)}>
          <video 
            src={fullUrl} 
            playsInline
            muted
            preload="metadata"
            className="max-h-48 sm:max-h-52 w-full object-cover rounded-xl"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
            <Play size={28} className="text-white fill-white" />
          </div>
        </div>
      ) : (
        <div className="relative group cursor-pointer overflow-hidden min-h-[90px] bg-zinc-950 flex items-center justify-center" onClick={() => onOpenLightbox(url)}>
          <img 
            src={fullUrl} 
            alt="Attachment" 
            className="max-h-48 sm:max-h-52 w-full object-cover rounded-xl transition-transform group-hover:scale-105"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 size={18} className="text-white" />
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

export function ClientSupportTickets() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { triggerTicketUpdate } = useSSEContext();
  
  // Real API State
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  
  // Mobile / Tablet Navigation State ('list' or 'chat')
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Chat Input & Attachments
  const [replyText, setReplyText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [mediaLightboxUrl, setMediaLightboxUrl] = useState<string | null>(null);
  
  // Pagination & Loading States
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // New Ticket Modal State
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<string>('Server Issue');
  const [newMessageBody, setNewMessageBody] = useState('');

  // UI Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Polling Hook for background updates
  const { updates } = useTicketPoller(isAuthenticated, 'Client');

  const activeTicket = tickets.find(t => t && t.id === activeTicketId) || null;
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch Real Tickets from Support Service
  const fetchTickets = async () => {
    try {
      const res = await api.get<any>('/api/support/tickets/?portal_role=Client');
      const ticketList = Array.isArray(res) ? res : (res?.items || []);

      const mapped: ClientTicket[] = ticketList.map((t: any) => ({
        id: String(t.id),
        subject: t.subject || 'No Subject',
        category: t.category || 'General',
        status: t.status || 'Open',
        lastMessageTime: t.updated_at ? new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        has_unseen_messages: t.has_unseen_messages || false,
        updated_at: t.updated_at,
        messages: (t.messages || []).map((m: any) => ({
          id: String(m.id),
          sender: m.sender_role,
          senderName: m.sender_role === 'Client' ? 'You' : 'Platform Support',
          text: m.content || '',
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          ...(m.attachment_url && {
            attachment: {
              name: m.attachment_url.split('/').pop() || 'attachment',
              size: 'File',
              type: 'image',
              url: m.attachment_url
            }
          })
        }))
      }));

      setTickets(prev => {
        const merged = mapped.map(newT => {
          const oldT = prev.find(p => p && p.id === newT.id);
          if (oldT && oldT.messages && oldT.messages.length > 0) {
            return { ...newT, messages: oldT.messages };
          }
          return newT;
        });

        merged.sort((a, b) => {
          if (!a || !b) return 0;
          if (a.has_unseen_messages && !b.has_unseen_messages) return -1;
          if (!a.has_unseen_messages && b.has_unseen_messages) return 1;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        });

        return merged;
      });
    } catch (err: any) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Detailed Ticket Messages for Active Ticket
  const fetchActiveTicketDetail = async (ticketId: string) => {
    try {
      const t = await api.get<any>(`/api/support/tickets/${ticketId}?portal_role=Client`);
      if (!t) return;

      const updatedMessages: TicketMessage[] = (t.messages || []).map((m: any) => ({
        id: String(m.id),
        sender: m.sender_role,
        senderName: m.sender_role === 'Client' ? 'You' : 'Platform Support',
        text: m.content || '',
        timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        ...(m.attachment_url && {
          attachment: {
            name: m.attachment_url.split('/').pop() || 'attachment',
            size: 'File',
            type: 'image',
            url: m.attachment_url
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
      // Handled
    }
  };

  // Sync polling updates into local state
  useEffect(() => {
    if (Array.isArray(updates) && updates.length > 0) {
      setTickets(prevTickets => {
        const newTickets = [...prevTickets];
        updates.forEach(update => {
          if (!update || !update.ticket || !update.ticket.id) return;

          const idx = newTickets.findIndex(t => t && t.id === String(update.ticket.id));
          
          const mappedTicket: Partial<ClientTicket> = {
            id: String(update.ticket.id),
            subject: update.ticket.subject || 'No Subject',
            category: update.ticket.category || 'General',
            status: update.ticket.status || 'Open',
            lastMessageTime: update.ticket.updated_at ? new Date(update.ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            has_unseen_messages: update.ticket.has_unseen_messages || false,
            updated_at: update.ticket.updated_at
          };

          if (idx !== -1) {
            newTickets[idx] = { ...newTickets[idx], ...mappedTicket } as ClientTicket;
          } else {
            newTickets.push({ ...mappedTicket, messages: [] } as ClientTicket);
          }
        });
        
        return newTickets.sort((a, b) => {
          if (!a || !b) return 0;
          if (a.has_unseen_messages && !b.has_unseen_messages) return -1;
          if (!a.has_unseen_messages && b.has_unseen_messages) return 1;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        });
      });

      // Only re-fetch if there is an active ticket AND it has unseen/new messages
      if (activeTicketId) {
        const activeUpdate = updates.find(u => u?.ticket && String(u.ticket.id) === activeTicketId);
        if (activeUpdate && (activeUpdate.ticket.has_unseen_messages || activeUpdate.last_message)) {
          fetchActiveTicketDetail(activeTicketId);
        }
      }
    }
  }, [updates]);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (activeTicketId) {
      setHasMoreMessages(true);
      fetchActiveTicketDetail(activeTicketId);
    }
  }, [activeTicketId]);

  useEffect(() => {
    if (!loadingMore) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages, mobileView]);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMoreMessages && !loadingMore && activeTicketId) {
      setLoadingMore(true);
      try {
        const currentCount = activeTicket?.messages?.length || 0;
        const res = await api.get<any[]>(`/api/support/tickets/${activeTicketId}/messages?offset=${currentCount}&limit=20&portal_role=Client`);
        if (!Array.isArray(res) || res.length < 20) setHasMoreMessages(false);
        if (Array.isArray(res) && res.length > 0) {
          const olderMessages: TicketMessage[] = res.map((m: any) => ({
            id: String(m.id),
            sender: m.sender_role,
            senderName: m.sender_role === 'Client' ? 'You' : 'Platform Support',
            text: m.content || '',
            timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            ...(m.attachment_url && {
              attachment: {
                name: m.attachment_url.split('/').pop() || 'attachment',
                size: 'File',
                type: 'image',
                url: m.attachment_url
              }
            })
          }));

          const scrollHeightBefore = chatContainerRef.current?.scrollHeight || 0;

          setTickets(prev => prev.map(t => {
            if (t && t.id === activeTicketId) {
              return { ...t, messages: [...olderMessages, ...(t.messages || [])] };
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
        // Handled
      } finally {
        setLoadingMore(false);
      }
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!t) return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch = (t.subject || '').toLowerCase().includes(q) || (t.id || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTicketId || (!replyText.trim() && !attachedFile)) return;

    if (activeTicket?.status === 'Closed' || activeTicket?.status === 'Done') {
      showToast('This ticket is closed.');
      return;
    }

    const formData = new FormData();
    formData.append('portal_role', 'Client');
    if (replyText.trim()) formData.append('content', replyText.trim());
    if (attachedFile) {
      const processedFile = await compressImageFile(attachedFile);
      formData.append('file', processedFile);
    }

    try {
      await api.post(`/api/support/tickets/${activeTicketId}/messages`, formData, { headers: {} });
      setReplyText('');
      setAttachedFile(null);
      await fetchActiveTicketDetail(activeTicketId);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message.');
    }
  };

  const handleCreateNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const formData = new FormData();
    formData.append('subject', newSubject.trim());
    formData.append('category', newCategory);
    if (newMessageBody.trim()) {
      formData.append('content', newMessageBody.trim());
    }
    formData.append('portal_role', 'Client');
    if (attachedFile) {
      const processedFile = await compressImageFile(attachedFile);
      formData.append('file', processedFile);
    }

    try {
      const created = await api.post<any>('/api/support/tickets/', formData, { headers: {} });
      setIsNewTicketOpen(false);
      setNewSubject('');
      setNewMessageBody('');
      setAttachedFile(null);
      showToast('Support ticket created successfully!');
      await fetchTickets();
      setActiveTicketId(String(created.id));
      setMobileView('chat');
    } catch (err: any) {
      showToast(err.message || 'Failed to create support ticket.');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    const target = tickets.find(t => t && t.id === ticketId);
    if (!target) return;

    const formData = new FormData();
    formData.append('status', 'Closed');

    try {
      await api.patch(`/api/support/tickets/${ticketId}/status`, formData, { headers: {} });
      showToast('Ticket successfully closed.');
      await fetchTickets();
      if (activeTicketId === ticketId) {
        await fetchActiveTicketDetail(ticketId);
      }
    } catch (err: any) {
      showToast(err.message || 'Could not update ticket status.');
    }
  };

  const handleAttachDiagnosticLog = () => {
    const textLog = `[PAYG VPN CLIENT DIAGNOSTIC LOG]
Client ID: Active Session
Timestamp: ${new Date().toISOString()}
Connected Server Node: ${activeTicket?.relatedServer || 'Primary Gateway'}
Status: Operational Payload`;

    setReplyText(prev => prev ? `${prev}\n\n${textLog}` : textLog);
    showToast('Diagnostic summary added to message body!');
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-zinc-950 border border-zinc-850 overflow-hidden h-[calc(100vh-120px)] relative font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-2xl bg-zinc-950 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Split-Screen Layout */}
      <div className="flex-1 min-h-0 flex divide-x divide-zinc-850">
        
        {/* ================= LEFT SIDEBAR: TICKETS LIST ================= */}
        <div className={cn(
          "w-full lg:w-80 xl:w-96 flex flex-col shrink-0 h-full min-h-0 bg-[#070709]/60",
          mobileView === 'list' ? 'flex' : 'hidden lg:flex'
        )}>
          
          {/* Header */}
          <div className="p-4 border-b border-zinc-850 flex items-center justify-between shrink-0 h-[72px] bg-zinc-950/40">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Headset size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                  <span>Support Tickets</span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                    {tickets.filter(t => t && t.status !== 'Closed').length} Active
                  </span>
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNewTicketOpen(true)}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 cursor-pointer"
              title="Open New Ticket"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-zinc-850 space-y-2.5 bg-zinc-950/20">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search subject or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900/80 text-xs text-zinc-200 border border-zinc-800 outline-none focus:border-emerald-500/50 transition-colors placeholder-zinc-500"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
              {(['All', 'Open', 'Pending', 'Closed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer",
                    statusFilter === st 
                      ? "bg-zinc-850 border-zinc-700 text-emerald-400 shadow-xs" 
                      : "bg-zinc-950/60 border-zinc-855 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-850/50">
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-xs">Loading support tickets...</div>
            ) : filteredTickets.length > 0 ? (
              filteredTickets.map((t) => {
                const isActive = t.id === activeTicketId;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTicketId(t.id);
                      setMobileView('chat');
                    }}
                    className={cn(
                      "w-full text-left p-4 transition-all flex flex-col space-y-2 relative group cursor-pointer",
                      isActive ? "bg-zinc-900/70 text-zinc-100" : "hover:bg-zinc-900/20 text-zinc-400"
                    )}
                  >
                    {/* Top Row: Unseen Dot + Title (Left) and Timestamp (Right) */}
                    <div className="flex justify-between items-center w-full gap-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {t.has_unseen_messages && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                        <h3 className={cn(
                          "text-xs font-bold leading-snug truncate transition-colors",
                          isActive ? "text-zinc-100" : (t.has_unseen_messages ? "text-emerald-300" : "text-zinc-300 group-hover:text-zinc-100")
                        )}>
                          {t.subject}
                        </h3>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">{t.lastMessageTime}</span>
                    </div>

                    {/* Bottom Row: Category Badge (Left) and Status Badge (Right) */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded-md text-zinc-400 font-mono">
                        {t.category}
                      </span>

                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider",
                        t.status === 'Open' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        t.status === 'Pending' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-zinc-850 text-zinc-500 border-zinc-800"
                      )}>
                        {t.status}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-zinc-600 text-xs space-y-2">
                <HelpCircle size={28} className="mx-auto text-zinc-700" />
                <p>No support tickets created yet.</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer Link */}
          <div className="p-3 border-t border-zinc-855 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Need setup help?</span>
            <button 
              type="button"
              onClick={() => navigate('/client/guides')}
              className="text-emerald-400 hover:underline font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>App Setup Guides</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ================= RIGHT SIDE: CONVERSATION THREAD ================= */}
        {activeTicket ? (
          <div className={cn(
            "flex-1 flex flex-col min-w-0 h-full min-h-0 bg-[#0a0a0c]/40 rounded-none",
            mobileView === 'chat' ? 'flex' : 'hidden lg:flex'
          )}>
            
            {/* Conversation Header */}
            <div className="px-4 sm:px-6 border-b border-zinc-850 bg-[#070709]/60 flex justify-between items-center h-[72px] shrink-0 rounded-none">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="lg:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl transition-colors flex items-center shrink-0 cursor-pointer"
                  title="Back to Tickets List"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 text-zinc-500 text-xs font-semibold">
                    <span className="text-emerald-400 font-bold">{activeTicket.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100 mt-0.5 truncate tracking-tight">{activeTicket.subject}</h3>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex items-center space-x-2 shrink-0 ml-3">
                {activeTicket.status !== 'Closed' && (
                  <button
                    type="button"
                    onClick={() => handleCloseTicket(activeTicket.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center space-x-1.5 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <XCircle size={12} />
                    <span>Close Ticket</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/client/vpn-servers')}
                  className="p-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl transition-colors hidden sm:flex cursor-pointer"
                  title="View VPN Servers List"
                >
                  <Server size={15} />
                </button>
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" ref={chatContainerRef} onScroll={handleScroll}>
              
              {loadingMore && (
                <div className="w-full flex justify-center py-2">
                  <RefreshCw size={16} className="animate-spin text-zinc-500" />
                </div>
              )}
              
              {activeTicket.status === 'Closed' && (
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-center space-y-1 text-xs text-zinc-400 mb-4">
                  <p className="font-bold text-zinc-300">This support ticket is closed.</p>
                  <p className="text-[11px] text-zinc-500">You can no longer reply to this conversation. Please open a new ticket if you require further assistance.</p>
                </div>
              )}

              {(activeTicket.messages || []).map((msg) => {
                const isClient = msg.sender === 'Client';
                return (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1",
                      isClient ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className="flex items-center space-x-1.5 text-[10px] text-zinc-500 px-1">
                      <span className={cn("font-bold", isClient ? "text-emerald-400" : "text-amber-400")}>
                        {msg.senderName}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className={cn(
                      "p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed border",
                      isClient 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200 rounded-tr-xs" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-200 rounded-tl-xs"
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

            {/* Attached File Bar */}
            {attachedFile && (
              <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-emerald-400 font-mono">
                <div className="flex items-center space-x-2 truncate">
                  <Paperclip size={14} className="shrink-0" />
                  <span className="truncate">Attached: {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setAttachedFile(null)} 
                  className="text-zinc-400 hover:text-rose-400 p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Reply Input Form */}
            <div className="p-4 border-t border-zinc-855 bg-[#070709]/60 shrink-0 space-y-2.5">
              
              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={handleAttachDiagnosticLog}
                  className="text-zinc-400 hover:text-emerald-400 transition-colors flex items-center space-x-1.5 cursor-pointer font-medium"
                >
                  <Terminal size={13} className="text-emerald-400" />
                  <span>Attach Diagnostic Log Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/client/guides')}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <span>View Setup Guides</span>
                  <ExternalLink size={11} />
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
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
                  className="p-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl transition-all cursor-pointer h-10 w-10 flex items-center justify-center shrink-0"
                  title="Attach File"
                >
                  <Paperclip size={16} />
                </button>

                <input 
                  type="text" 
                  placeholder={activeTicket.status === 'Closed' ? "Ticket is closed." : "Type response to support..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={activeTicket.status === 'Closed'}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-xs text-zinc-100 outline-none focus:bg-zinc-900 transition-colors placeholder-zinc-500 border border-zinc-800 focus:border-zinc-700 disabled:opacity-40 h-10"
                />

                <button
                  type="submit"
                  disabled={activeTicket.status === 'Closed' || (!replyText.trim() && !attachedFile)}
                  className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-zinc-950 font-bold rounded-xl transition-all shrink-0 h-10 w-10 flex items-center justify-center cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </form>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-600 space-y-2">
            <MessageSquare size={36} className="text-zinc-700" />
            <p className="text-sm">Select a ticket from the left panel to view the conversation thread.</p>
          </div>
        )}

      </div>

      {/* NEW TICKET MODAL */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-[#0b0b0d] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            <button 
              type="button"
              onClick={() => setIsNewTicketOpen(false)} 
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
            >
              <X size={16} />
            </button>

            <form onSubmit={handleCreateNewTicket} className="p-6 space-y-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-100 flex items-center">
                  <Headset size={18} className="text-emerald-400 mr-2" />
                  Open Support Ticket
                </h4>
                <p className="text-xs text-zinc-500">Your message will go directly to platform administration.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Frankfurt node connecting but low download speed"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-850 focus:border-zinc-700 outline-none text-xs text-zinc-200 placeholder-zinc-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Server Issue', 'Billing & Top-Up', 'Connection Troubleshooting', 'General Inquiry'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={cn(
                        "py-2 px-2 text-[10px] font-semibold rounded-xl border text-center transition-all cursor-pointer",
                        newCategory === cat 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                          : "bg-zinc-900 text-zinc-400 border-zinc-850 hover:bg-zinc-850"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Describe Your Issue (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Please specify your device (iOS, Android, Windows), app version, and any error message you see..."
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-850 focus:border-zinc-700 outline-none text-xs text-zinc-200 placeholder-zinc-500 resize-none"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Submit Support Request
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Fullscreen Media Lightbox Modal */}
      {mediaLightboxUrl && (
        <div 
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setMediaLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setMediaLightboxUrl(null)}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2.5 bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-700 text-zinc-100 rounded-full z-20 cursor-pointer shadow-2xl"
            title="Close Fullscreen"
          >
            <X size={20} />
          </button>
          <div className="w-full max-w-4xl max-h-[85vh] flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
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