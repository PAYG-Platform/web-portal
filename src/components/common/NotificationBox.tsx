// src/components/common/NotificationBox.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCircle2, X, 
  MessageSquare, UserCheck, Wallet, Server, ShieldAlert, RefreshCw
} from 'lucide-react';
import { notificationService, NotificationItem, PaginatedNotifications } from '../../services/notificationService';

interface NotificationBoxProps {
  isOpen: boolean;
  onClose: () => void;
  paginatedData: PaginatedNotifications;
  loading: boolean;
  fetchPage: (page: number, append?: boolean) => Promise<void>;
  onUnseenCleared: (clearedCount: number) => void;
  onClearAllUnseen?: () => void;
}

export const NotificationBox: React.FC<NotificationBoxProps> = ({
  isOpen,
  onClose,
  paginatedData,
  loading,
  fetchPage,
  onUnseenCleared,
  onClearAllUnseen
}) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const seenTimerRef = useRef<NodeJS.Timeout | null>(null);

  const items = paginatedData.items || [];
  const totalPages = paginatedData.total_pages || 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      fetchPage(1, false);
    }
  }, [isOpen, fetchPage]);

  // When opening the notification box and waiting for half a second (500ms),
  // mark all notifications as seen and clear the green blinking dot
  useEffect(() => {
    if (!isOpen) return;

    seenTimerRef.current = setTimeout(async () => {
      try {
        await notificationService.markAllSeen();
        if (items && items.length > 0) {
          items.forEach(n => {
            n.is_seen = true;
          });
        }
        onClearAllUnseen?.();
      } catch {
        // Handled
      }
    }, 500);

    return () => {
      if (seenTimerRef.current) clearTimeout(seenTimerRef.current);
    };
  }, [isOpen, items, onClearAllUnseen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 40 &&
      currentPage < totalPages &&
      !loading
    ) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPage(nextPage, true);
    }
  };

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ticket':
        return <MessageSquare size={13} className="text-teal-400" />;
      case 'connection':
        return <UserCheck size={13} className="text-emerald-400" />;
      case 'billing':
        return <Wallet size={13} className="text-amber-400" />;
      case 'server':
        return <Server size={13} className="text-blue-400" />;
      default:
        return <ShieldAlert size={13} className="text-rose-400" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    onClose();
    if (item.link_url) {
      navigate(item.link_url);
    }
  };

  return (
    <div className="absolute -end-10 sm:end-0 top-10 w-80 max-w-[calc(100vw-2rem)] sm:w-88 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150">
      
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950 shrink-0">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Bell size={14} className="text-emerald-400 shrink-0" />
          <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Notifications
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* List with Infinite Scroll */}
      <div 
        className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800"
        onScroll={handleScroll}
      >
        {loading && currentPage === 1 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">
            Loading...
          </div>
        ) : items.length > 0 ? (
          <>
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer flex items-start space-x-2.5 rtl:space-x-reverse group ${
                  !item.is_seen 
                    ? 'bg-zinc-900/90 border border-zinc-800' 
                    : 'bg-transparent hover:bg-zinc-900/40 border border-transparent'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h4>

                    {!item.is_seen && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug font-normal line-clamp-2">
                    {item.message}
                  </p>

                  <div className="pt-0.5 text-[9px] text-zinc-500 font-mono">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {loading && currentPage > 1 && (
              <div className="py-2 text-center">
                <RefreshCw size={13} className="animate-spin text-emerald-400 mx-auto" />
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-500 space-y-1">
            <CheckCircle2 size={18} className="mx-auto text-zinc-600 mb-1" />
            <p className="font-medium text-zinc-400">No Notifications</p>
            <p className="text-[10px] text-zinc-500">Your inbox is clean.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default NotificationBox;