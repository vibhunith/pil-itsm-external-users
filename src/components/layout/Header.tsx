'use client';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, User } from 'lucide-react';
import type { SessionUser } from '@/types/user';

interface HeaderProps {
  user: SessionUser;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#003087] shadow-md">
      <div className="flex h-full items-center justify-between px-4">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {/* PIL Logo — replace src with real logo asset */}
            <div className="flex h-9 w-9 items-center justify-center rounded bg-white text-[#003087] font-bold text-sm">
              PIL
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-semibold text-sm leading-tight">Pacific International Lines</p>
              <p className="text-blue-200 text-xs">IT Support Portal</p>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-blue-100 hover:bg-white/10 transition-colors"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-blue-100">
            <User className="h-4 w-4" />
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white leading-tight">{user.displayName}</p>
              <p className="text-xs text-blue-200">{user.company}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
