// vpn-payg-frontend/src/layouts/AdminLayout.tsx
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Support & Ticketing views require full-bleed flex containers for real-time chat layouts
  const isSupportRoute = location.pathname.includes('/support');

  return (
    <div className="h-screen w-full flex font-sans transition-colors duration-300 bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Primary Left Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Administrative Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header Navigation Bar */}
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Dynamic Route View Rendering */}
        {isSupportRoute ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 min-w-0">
            <div className="max-w-[1600px] w-full mx-auto pb-12 min-w-0">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;