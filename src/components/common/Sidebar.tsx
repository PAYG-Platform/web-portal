// src/components/common/Sidebar.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  Shield,
  LayoutDashboard,
  Server,
  Users,
  LogOut,
  Settings,
  Headset,
  Terminal,
  FileCheck,
  Rocket,
  Wallet,
  History,
  Globe,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import { Role } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTicketPoller } from '../../hooks/useTicketPoller';
import { useBillingNotification } from '../../hooks/useBillingNotification';
import { useAdminPendingApprovals } from '../../hooks/useAdminPendingApprovals';
import { cn } from '../ui/StatCard';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  translationKey: string;
  icon: React.ElementType;
  exact?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, setRole, signOut, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Polling hook to track unseen support ticket updates
  const { updates } = useTicketPoller(isAuthenticated, role);
  const hasUnseenSupport = updates.some(u => u?.ticket?.has_unseen_messages);

  // Hook to track unseen payment & billing updates (Client)
  const { hasUnseenBilling } = useBillingNotification(isAuthenticated, role);

  // Hook to track pending top-ups & refunds waiting for approval (Admin)
  const { pendingCount } = useAdminPendingApprovals(isAuthenticated, role);
  const hasPendingApprovals = role === 'Admin' && pendingCount > 0;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const isRtl = i18n.dir() === 'rtl' || i18n.language === 'fa';
  const baseRole: Role = user?.role || 'Client';

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const nextState = !prev;
      localStorage.setItem('sidebar_collapsed', String(nextState));
      return nextState;
    });
  };

  // Admin Navigation Definitions
  const adminLinks: NavItem[] = [
    { name: 'Overview', path: '/admin', translationKey: 'overview', icon: LayoutDashboard, exact: true },
    { name: 'Servers', path: '/admin/servers', translationKey: 'servers', icon: Server },
    { name: 'Users', path: '/admin/users', translationKey: 'users', icon: Users },
    { name: 'Client Top-ups & Refunds', path: '/admin/topups', translationKey: 'client_topups', icon: FileCheck },
    { name: 'Support / Tickets', path: '/admin/support', translationKey: 'support_tickets', icon: Headset },
    { name: 'System Logs', path: '/admin/logs', translationKey: 'system_logs', icon: Terminal },
    { name: 'Settings', path: '/admin/settings', translationKey: 'settings', icon: Settings },
  ];

  // Client Navigation Definitions
  const clientLinks: NavItem[] = [
    { name: 'Overview', path: '/client', translationKey: 'overview', icon: LayoutDashboard, exact: true },
    { name: 'Servers', path: '/client/vpn-servers', translationKey: 'servers', icon: Server },
    { name: 'Top-up Wallet', path: '/client/wallet', translationKey: 'topup_wallet', icon: Wallet },
    { name: 'Payment Histories', path: '/client/history', translationKey: 'payment_histories', icon: History },
    { name: 'Connection Guides & Apps', path: '/client/guides', translationKey: 'connection_guides', icon: Rocket },
    { name: 'Support / Tickets', path: '/client/support', translationKey: 'support_tickets', icon: Headset },
    { name: 'Account Settings', path: '/client/settings', translationKey: 'account_settings', icon: Settings },
  ];

  const currentLinks = role === 'Admin' ? adminLinks : clientLinks;

  const isNavActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role;
    setRole(newRole);
    if (newRole === 'Admin') navigate('/admin');
    else if (newRole === 'Client') navigate('/client');
    onClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = () => {
    signOut();
    navigate('/login');
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 start-0 z-50 transform transition-all duration-200 ease-in-out lg:translate-x-0',
          'border-e flex flex-col bg-zinc-900 border-zinc-800 shrink-0 shadow-sm',
          isCollapsed ? 'lg:w-18' : 'lg:w-64',
          'w-64',
          isOpen
            ? 'translate-x-0'
            : isRtl
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          "h-14 flex items-center border-b border-zinc-800 shrink-0 transition-all bg-zinc-900",
          isCollapsed ? "lg:justify-center lg:px-2 px-4 justify-between" : "justify-between px-5"
        )}>
          <div
            onClick={() => handleNavigation('/')}
            className="flex items-center space-x-2.5 rtl:space-x-reverse cursor-pointer group min-w-0"
            title="PAYG MNG"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield size={16} />
            </div>
            <span className={cn(
              "text-sm font-bold tracking-tight text-zinc-100 transition-all truncate",
              isCollapsed && "lg:hidden"
            )}>
              PAYG MNG
            </span>
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
            title={isCollapsed ? t('expand_sidebar', 'Expand Sidebar') : t('collapse_sidebar', 'Collapse Sidebar')}
          >
            {isCollapsed ? (
              isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
            ) : (
              isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="lg:hidden p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 scrollbar-none">
          
          {/* Role Portal Switcher */}
          {baseRole === 'Admin' && (
            <div className="px-1">
              <div className="relative">
                <select
                  value={role}
                  onChange={handleRoleChange}
                  title={`Role Switcher (${role})`}
                  className={cn(
                    "w-full py-1.5 text-xs font-semibold rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300 outline-none focus:border-zinc-700 transition-colors cursor-pointer appearance-none",
                    isCollapsed ? "lg:px-1 text-center" : "px-2.5"
                  )}
                >
                  <option value="Admin">{isCollapsed ? "Admin" : "Admin Portal"}</option>
                  <option value="Client">{isCollapsed ? "Client" : "Client Portal"}</option>
                </select>
              </div>
            </div>
          )}

          {/* Navigation Links Group */}
          <nav className="space-y-0.5">
            <p className={cn(
              "text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2.5 transition-all",
              isCollapsed && "lg:hidden"
            )}>
              {t('navigation', 'Navigation')}
            </p>

            {currentLinks.map((link) => {
              const active = isNavActive(link);
              const Icon = link.icon;
              const localizedName = t(link.translationKey, link.name);
              
              const isSupportLink = link.translationKey === 'support_tickets' || link.path.includes('/support');
              const isTopupAdminLink = link.path === '/admin/topups';
              const isPaymentHistoryLink = link.path === '/client/history';

              // Support, billing, and admin top-ups all use the standardized green blinking dot
              const showGreenBlinkingDot = 
                (isTopupAdminLink && hasPendingApprovals) ||
                (isSupportLink && hasUnseenSupport) || 
                (isPaymentHistoryLink && hasUnseenBilling);

              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => handleNavigation(link.path)}
                  title={isCollapsed ? localizedName : undefined}
                  className={cn(
                    'w-full flex items-center px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-start relative',
                    isCollapsed ? 'lg:justify-center' : 'justify-between',
                    active
                      ? 'bg-zinc-900 text-zinc-100 font-semibold border border-zinc-800/80 shadow-xs'
                      : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  )}
                >
                  <div className={cn(
                    "flex items-center space-x-2.5 rtl:space-x-reverse min-w-0",
                    isCollapsed && "lg:space-x-0"
                  )}>
                    <Icon
                      size={16}
                      className={cn(
                        'shrink-0 transition-colors',
                        active ? 'text-emerald-400' : 'text-zinc-400'
                      )}
                    />
                    <span className={cn(
                      "truncate transition-all",
                      isCollapsed && "lg:hidden"
                    )}>
                      {localizedName}
                    </span>
                  </div>

                  {/* Standardized Green Blinking Dot */}
                  {showGreenBlinkingDot && (
                    <span 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse",
                        isCollapsed && "lg:absolute lg:top-1.5 lg:end-1.5"
                      )} 
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sign Out */}
        <div className="p-2.5 border-t border-zinc-800 shrink-0 bg-zinc-900">
          <button
            type="button"
            onClick={handleSignOut}
            title={isCollapsed ? t('sign_out', 'Sign Out') : undefined}
            className={cn(
              "flex items-center w-full rounded-xl transition-colors cursor-pointer text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60 p-2 text-xs font-medium",
              isCollapsed ? "lg:justify-center" : "justify-start"
            )}
          >
            <div className={cn("flex items-center space-x-2.5 rtl:space-x-reverse", isCollapsed && "lg:space-x-0")}>
              <LogOut size={16} className="text-zinc-500 shrink-0" />
              <span className={cn(
                "transition-all",
                isCollapsed && "lg:hidden"
              )}>
                {t('sign_out', 'Sign Out')}
              </span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;