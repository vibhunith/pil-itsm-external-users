'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/tickets', label: 'My Tickets', Icon: Ticket },
  { href: '/tickets/create', label: 'Create Ticket', Icon: PlusCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-56 bg-white border-r border-gray-200 shadow-sm z-40">
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[#003087] text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
