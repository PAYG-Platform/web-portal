// vpn-payg-frontend/src/routes/AppRoutes.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AdminLayout } from '../layouts/AdminLayout';
import { ClientLayout } from '../layouts/ClientLayout';

// Public & Shared Pages
import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { EditAccount } from '../pages/EditAccount';

// Admin Workspace Pages
import { Overview as AdminOverview } from '../pages/admin/Overview';
import { Servers as AdminServers } from '../pages/admin/Servers';
import { Users as AdminUsers } from '../pages/admin/Users';
import { ClientTopups as AdminClientTopups } from '../pages/ClientTopups';
import { Support as AdminSupport } from '../pages/admin/Support';
import { SystemLogs as AdminLogs } from '../pages/admin/SystemLogs';
import { Settings as AdminSettings } from '../pages/admin/Settings';

// Client Workspace Pages
import { Overview as ClientOverview } from '../pages/client/Overview';
import { ClientServers } from '../pages/ClientServers';
import { TopUpWallet as ClientWallet } from '../pages/client/TopUpWallet';
import { PaymentHistories as ClientHistory } from '../pages/client/PaymentHistories';
import { RefundRequest as ClientRefund } from '../pages/client/RefundRequest';
import { ConnectionGuides as ClientGuides } from '../pages/client/ConnectionGuides';
import { Support as ClientSupport } from '../pages/client/Support';
import { Settings as ClientSettings } from '../pages/client/Settings';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, signIn, signUp, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect users to their correct workspace if they attempt to manually access an unauthorized role prefix
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const path = location.pathname;
      if (role === 'Admin' && path.startsWith('/client')) {
        navigate('/admin', { replace: true });
      } else if (role === 'Client' && path.startsWith('/admin')) {
        navigate('/client', { replace: true });
      }
    }
  }, [role, isAuthenticated, isLoading, location.pathname, navigate]);

  // 1. SESSION VERIFICATION LOADING SCREEN
  // Prevents premature redirects while checkSession() verifies the auth cookie on page refresh
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-3 text-zinc-100">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-zinc-400 font-medium">Verifying Session...</span>
      </div>
    );
  }

  // 2. UNAUTHENTICATED USER FLOW
  // Shows the public landing page on '/' and the login/signup form on '/login'
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login onSignIn={signIn} onSignUp={signUp} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // 3. AUTHENTICATED USER FLOW
  return (
    <Routes>
      {/* Public Landing Page (with active Dashboard buttons when logged in) */}
      <Route path="/" element={<LandingPage />} />

      {/* Direct Login URL redirects to the appropriate role dashboard */}
      <Route
        path="/login"
        element={<Navigate to={role === 'Admin' ? '/admin' : '/client'} replace />}
      />

      {/* ================= ADMIN WORKSPACE ================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="servers" element={<AdminServers />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="topups" element={<AdminClientTopups />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="edit-account" element={<EditAccount />} />
      </Route>

      {/* ================= CLIENT WORKSPACE ================= */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['Client']}>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientOverview />} />
        <Route path="regions" element={<Navigate to="/client/vpn-servers" replace />} />
        <Route path="vpn-servers" element={<ClientServers />} />
        <Route path="wallet" element={<ClientWallet />} />
        <Route path="history" element={<ClientHistory />} />
        <Route path="refund" element={<ClientRefund />} />
        <Route path="guides" element={<ClientGuides />} />
        <Route path="support" element={<ClientSupport />} />
        <Route path="settings" element={<ClientSettings />} />
        <Route path="edit-account" element={<EditAccount />} />
      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;