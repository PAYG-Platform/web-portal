// src/components/Layout.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, X, Bell, User, Sun, Moon, 
  LayoutDashboard, Server, Users, Receipt, 
  LogOut, Shield, Wallet, History, Settings, UserCog,
  Headset, Terminal, FileCheck, Banknote, Activity, Rocket
} from 'lucide-react';
import { Role } from '../types';
import { cn } from './ui/StatCard';

interface LayoutProps {
  children: React.ReactNode;
  role: Role;
  setRole: (role: Role) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut?: () => void;
}

export function Layout({ children, role, setRole, activeTab, setActiveTab, onSignOut }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Admin Navigation Definitions matching Sidebar standards
  const adminLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/admin' },
    { name: 'Servers', icon: Server, path: '/admin/servers' },
    { name: 'Sellers', icon: UserCog, path: '/admin/sellers' },
    { name: 'Users', icon: Users, path: '/admin/users' },
    { name: 'Settlements', icon: Receipt, path: '/admin/settlements' },
    { name: 'Support / Tickets', icon: Headset, path: '/admin/support' },
    { name: 'System Logs', icon: Terminal, path: '/admin/logs' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  // Seller Navigation Definitions matching Sidebar standards
  const sellerLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/seller' },
    { name: 'Clients', icon: Users, path: '/seller/clients' },
    { name: 'Client Top-ups & Refunds', icon: FileCheck, path: '/seller/topups' },
    { name: 'Settle Debt', icon: Banknote, path: '/seller/settle' },
    { name: 'Support / Tickets', icon: Headset, path: '/seller/support' },
    { name: 'Settings', icon: Settings, path: '/seller/settings' },
  ];

  // Client Navigation Definitions matching Sidebar standards
  const clientLinks = [
    { name: 'Overview', icon: LayoutDashboard, path: '/client' },
    { name: 'Sellers', icon: Users, path: '/client/sellers' },
    { name: 'Traffic Routing Servers', icon: Server, path: '/client/vpn-servers' },
    { name: 'Top-up Wallet', icon: Wallet, path: '/client/wallet' },
    { name: 'Payment Histories', icon: History, path: '/client/history' },
    { name: 'Connection Guides', icon: Rocket, path: '/client/guides' },
    { name: 'Support / Tickets', icon: Headset, path: '/client/support' },
    { name: 'Account Settings', icon: Settings, path: '/client/settings' },
  ];

  const links = role === 'Admin' ? adminLinks : clientLinks;

  return (
    <div className="h-screen flex w-full font-sans transition-colors duration-300 bg-zinc-950 text-zinc-100 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 start-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-e flex flex-col bg-zinc-950 border-zinc-800/80 shadow-2xl lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse text-emerald-400">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield size={22} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-zinc-100">PAYG MNG</span>
          </div>
          <button 
            className="lg:hidden p-1 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6 scrollbar-none">
          {/* Role Portal Switcher */}
          <div className="px-1">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 px-2">
              Role Portal Switcher
            </label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              <option value="Admin">Admin Portal</option>
              <option value="Client">Client Portal</option>
            </select>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-3">
              Navigation
            </p>
            {links.map((link) => {
              const isActive = activeTab === link.name;
              const Icon = link.icon;
              return (
                <button
                  key={link.name}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-start cursor-pointer border",
                    isActive 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold shadow-sm"
                      : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 font-medium"
                  )}
                  onClick={() => {
                    setActiveTab(link.name);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                    <Icon size={18} className={cn("transition-colors shrink-0", isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className="text-xs truncate">{link.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sign Out */}
        <div className="p-3 border-t border-zinc-800/60 bg-zinc-950 shrink-0">
          <button 
            onClick={onSignOut}
            className="flex items-center space-x-3 rtl:space-x-reverse px-3 py-2.5 w-full rounded-xl transition-colors cursor-pointer text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 group"
          >
            <LogOut size={18} className="text-zinc-500 group-hover:text-rose-400 transition-colors shrink-0" />
            <span className="font-semibold text-xs">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b sticky top-0 z-30 bg-zinc-950/80 border-zinc-850 backdrop-blur-md">
          <div className="flex items-center">
            <button 
              className="lg:hidden me-4 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-bold capitalize hidden sm:block text-zinc-100 tracking-tight">
              {role} Dashboard
            </h1>
          </div>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full transition-colors text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              className="p-2 rounded-full transition-colors relative text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 cursor-pointer"
              title="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
            </button>

            <div className="h-8 w-px bg-zinc-850 mx-1 hidden sm:block"></div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center space-x-2.5 rtl:space-x-reverse ps-2 pe-3 py-1.5 rounded-full border transition-colors border-zinc-800 hover:bg-zinc-900/50 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 font-bold shadow-sm">
                  <User size={15} />
                </div>
                <span className="text-sm font-semibold hidden sm:block text-zinc-200">
                  {role === 'Admin' ? 'Super Admin' : 'Client User'}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute end-0 mt-2 w-48 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 bg-zinc-950 border-zinc-800">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab('Edit Account');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 text-xs font-semibold transition-colors text-start text-zinc-300 hover:bg-zinc-900 hover:text-emerald-400 cursor-pointer"
                    >
                      <UserCog size={16} />
                      <span>Edit Account</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('Settings');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2 rtl:space-x-reverse px-4 py-2.5 text-xs font-semibold transition-colors text-start text-zinc-300 hover:bg-zinc-900 hover:text-emerald-400 cursor-pointer"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        {activeTab === 'Support / Tickets' ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
            {children}
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 lg:p-6 flex flex-col min-h-0">
            <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}