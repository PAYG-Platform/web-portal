// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Role } from '../types';
import { useAuth } from '../hooks/useAuth';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  // 1. Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Redirect to the user's correct dashboard if they try to access a route they shouldn't
  // FIX: This prevents the app from kicking you to the Landing Page ("/") during a role switch or refresh
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'Admin' ? '/admin' : '/client'} replace />;
  }

  // 3. Render children (if provided) or Outlet for nested layout routes
  return <>{children ? children : <Outlet />}</>;
};