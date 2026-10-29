import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';

export const ClientLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Check if current route is support/tickets to apply a full-height, non-padding layout
  const isSupportRoute = location.pathname.includes('/support');

  return (
    <div className="h-screen flex w-full font-sans transition-colors duration-300 bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        {/* Dynamic Page Content via React Router */}
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

export default ClientLayout;