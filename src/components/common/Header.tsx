// src/components/common/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, User, Sun, Moon, Settings, UserCog, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { updateDocumentDirection } from '../../i18n/i18n';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotificationPoller } from '../../hooks/useNotificationPoller';
import { NotificationBox } from './NotificationBox';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { role, user, isAuthenticated, setUserState } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Notification Poller Hook
  const {
    unseenCount,
    setUnseenCount,
    paginatedData,
    loading: notificationsLoading,
    fetchPage
  } = useNotificationPoller(isAuthenticated);

  const [notificationBoxOpen, setNotificationBoxOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationBoxOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLang = async (lang: string) => {
    i18n.changeLanguage(lang);
    updateDocumentDirection(lang);
    setLangMenuOpen(false);

    // If user is logged in, persist the preference to database
    if (isAuthenticated && user) {
      try {
        const { authService } = await import('../../services/authService');
        await authService.updateLanguage(lang);
        setUserState({ ...user, language: lang });
      } catch (err) {
        console.error("Failed to persist language in database:", err);
      }
    }
  };

  const currentLang = i18n.language || 'en';

  const getRoleBasePath = () => {
    switch (role) {
      case 'Admin': return '/admin';
      case 'Client': return '/client';
      default: return '/client';
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setProfileMenuOpen(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b sticky top-0 z-30 bg-zinc-900/90 border-zinc-800 backdrop-blur-md shadow-xs">
      <div className="flex items-center">
        <button
          type="button"
          className="lg:hidden me-4 text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors"
          onClick={onOpenSidebar}
          aria-label="Open Sidebar"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold capitalize hidden sm:block text-zinc-100 tracking-tight">
          {t(role.toLowerCase(), role)} {t('dashboard', 'Dashboard')}
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
        
        {/* Language Selector */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full border border-zinc-800 hover:bg-zinc-900/50 text-xs font-bold text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer rtl:space-x-reverse"
          >
            <Globe size={16} className="text-emerald-400 shrink-0" />
            <span className="uppercase font-mono">{currentLang}</span>
          </button>

          {langMenuOpen && (
            <div className="absolute end-0 mt-2 w-36 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 bg-zinc-900 border-zinc-800">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => changeLang('en')}
                  className={`w-full text-start px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    currentLang === 'en' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span>English</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeLang('fa')}
                  className={`w-full text-start px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    currentLang === 'fa' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span>فارسی</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeLang('ru')}
                  className={`w-full text-start px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    currentLang === 'ru' ? 'text-emerald-400 bg-zinc-900' : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span>Русский</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-full transition-colors text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 cursor-pointer"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* NOTIFICATION BELL WITH GREEN DOT */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationBoxOpen(!notificationBoxOpen)}
            className="p-2 rounded-full transition-colors relative text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 cursor-pointer"
            title="Notifications"
          >
            <Bell size={20} />
            
            {/* Green Dot ONLY shown when unseen_count > 0 */}
            {unseenCount > 0 && (
              <span className="absolute top-1.5 end-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-zinc-950" />
            )}
          </button>

          {/* Paginated Notification Dropdown Box */}
          <NotificationBox
            isOpen={notificationBoxOpen}
            onClose={() => setNotificationBoxOpen(false)}
            paginatedData={paginatedData}
            loading={notificationsLoading}
            fetchPage={fetchPage}
            onUnseenCleared={(clearedCount) => {
              setUnseenCount(prev => Math.max(0, prev - clearedCount));
            }}
            onClearAllUnseen={() => {
              setUnseenCount(0);
            }}
          />
        </div>

        {/* Vertical Separator */}
        <div className="h-8 w-px bg-zinc-850 mx-1 hidden sm:block"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center space-x-2.5 ps-2 pe-3 py-1.5 rounded-full border transition-colors border-zinc-800 hover:bg-zinc-900/50 cursor-pointer rtl:space-x-reverse"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-zinc-950 font-bold shadow-sm">
              <User size={15} />
            </div>
            <span className="text-sm font-semibold hidden sm:block text-zinc-200">
              {user?.name || (role === 'Admin' ? 'Super Admin' : 'Client User')}
            </span>
          </button>

          {profileMenuOpen && (
            <div className="absolute end-0 mt-2 w-48 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 bg-zinc-900 border-zinc-800">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => handleNavigate(`${getRoleBasePath()}/edit-account`)}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold transition-colors text-start text-zinc-300 hover:bg-zinc-900 hover:text-emerald-400 cursor-pointer rtl:space-x-reverse"
                >
                  <UserCog size={16} />
                  <span>{t('edit_account', 'Edit Account')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigate(`${getRoleBasePath()}/settings`)}
                  className="w-full flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold transition-colors text-start text-zinc-300 hover:bg-zinc-900 hover:text-emerald-400 cursor-pointer rtl:space-x-reverse"
                >
                  <Settings size={16} />
                  <span>{t('settings', 'Settings')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};