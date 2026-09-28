// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import { Role } from '../types';
import { authService, UserProfile, SignupResult } from '../services/authService';

export type ViewMode = 'admin' | 'client';

export interface AuthContextType {
  user: UserProfile | null;
  role: Role;
  viewMode: ViewMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  setViewMode: (mode: ViewMode) => void;
  setRole: (role: Role) => void;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string, confirm_password: string, billing_currency?: 'IRT' | 'USD') => Promise<SignupResult>;
  requestPasswordResetEmail: (email: string) => Promise<string>;
  confirmPasswordReset: (recoveryKey: string, newPassword: string, confirmPassword: string) => Promise<string>;
  signOut: () => Promise<void>;
  setUserState: (user: UserProfile) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { useTranslation } from 'react-i18next';
import { updateDocumentDirection } from '../i18n/i18n';
import { getCookie, setCookie } from '../utils/cookies';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<Role>('Client');
  const [viewMode, setViewModeState] = useState<ViewMode>('client');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore user session on initial app load via /auth/me cookie check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await authService.getMe();
        if (currentUser) {
          setUser(currentUser);
          setRoleState(currentUser.role);

          if (currentUser.role === 'Admin') setViewModeState('admin');
          else setViewModeState('client');

          // Logged-in user: database language preference overrides cookie selection
          if (currentUser.language) {
            i18n.changeLanguage(currentUser.language);
            updateDocumentDirection(currentUser.language, true);
          }

          setIsAuthenticated(true);
        }
      } catch (err) {
        localStorage.removeItem('access_token');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [i18n]);

  const setUserState = (profile: UserProfile) => {
    setUser(profile);
    setRoleState(profile.role);
    setViewModeState(profile.role === 'Admin' ? 'admin' : 'client');
    setIsAuthenticated(true);
  };

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole === 'Admin') setViewModeState('admin');
    else setViewModeState('client');
  };

  const signIn = async (identifier: string, password: string) => {
    const result = await authService.login(identifier, password);
    setUserState(result.user);

    // Replace cookie selection with user's DB language preference upon login
    if (result.user?.language) {
      i18n.changeLanguage(result.user.language);
      updateDocumentDirection(result.user.language, true);
    }
  };

  const signUp = async (
    username: string,
    email: string,
    password: string,
    confirm_password: string,
    billing_currency: 'IRT' | 'USD' = 'IRT'
  ): Promise<SignupResult> => {
    // Read active cookie/language and persist as initial user preference in DB
    const currentLang = getCookie('payg_lang') || i18n.language || 'en';
    const res = await authService.signup(username, email, password, confirm_password, currentLang, billing_currency);
    setCookie('payg_lang', currentLang);
    return res;
  };

  const requestPasswordResetEmail = async (email: string): Promise<string> => {
    return await authService.requestPasswordResetEmail(email);
  };

  const confirmPasswordReset = async (
    recoveryKey: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<string> => {
    return await authService.confirmPasswordReset(recoveryKey, newPassword, confirmPassword);
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Continue client cleanup
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setViewModeState('client');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        viewMode,
        isAuthenticated,
        isLoading,
        setViewMode,
        setRole,
        signIn,
        signUp,
        requestPasswordResetEmail,
        confirmPasswordReset,
        signOut,
        setUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};