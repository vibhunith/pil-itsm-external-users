'use client';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarContext';
import type { SessionUser } from '@/types/user';

function Shell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <Sidebar />
      {/* Main reclaims the sidebar's width when collapsed. Animated to match the sidebar slide. */}
      <main className={`pt-14 transition-[margin] duration-200 ease-in-out ${collapsed ? 'ml-0' : 'ml-[88px]'}`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function PortalShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell user={user}>{children}</Shell>
    </SidebarProvider>
  );
}
