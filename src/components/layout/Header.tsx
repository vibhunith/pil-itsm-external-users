'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { SessionUser } from '@/types/user';
import { useSidebar } from '@/components/layout/SidebarContext';

interface HeaderProps {
  user: SessionUser;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();

  async function handleLogout() {
    // Clear per-user localStorage state before leaving
    try {
      const email = user.email;
      localStorage.removeItem(`pil_ticket_filters_${email}`);
      localStorage.removeItem(`pil_ticket_columns_${email}`);
    } catch { /* ignore */ }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex h-full items-center justify-between pl-0 pr-4">
        {/* Logo area — same width as sidebar */}
        <div className="flex items-center justify-center w-[88px] h-full border-r border-gray-200 flex-shrink-0">
          <Image
            src="/pil-logo.png"
            alt="PIL"
            width={36}
            height={36}
            className="object-contain"
          />
        </div>

        {/* Collapse / expand the left panel */}
        <button
          onClick={toggle}
          className="flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors ml-2 flex-shrink-0"
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          aria-pressed={collapsed}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {/* Brand */}
        <div className="flex items-center ml-3 flex-1">
          <div>
            <p className="text-gray-800 font-semibold text-sm leading-tight">Pacific International Lines</p>
            <p className="text-gray-400 text-[11px]">IT Support Portal</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <button className="flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 transition-colors" title="Notifications">
            <Bell className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md text-gray-600">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003087] text-white flex-shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{user.displayName}</p>
              <p className="text-[11px] text-gray-400">{user.company}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
