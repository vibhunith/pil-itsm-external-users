import { getSession } from '@/lib/auth/session';
import { getDashboardStats } from '@/lib/graph/tickets';
import Link from 'next/link';
import { Ticket, PlusCircle, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const stats = await getDashboardStats(user.email);

  const cards = [
    {
      label: 'Total Tickets',
      value: stats.total,
      Icon: BarChart3,
      textColor: 'text-[#003087]',
      bg: 'bg-blue-50',
      href: '/tickets',
    },
    {
      label: 'Open',
      value: stats.open,
      Icon: AlertCircle,
      textColor: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/tickets?status=Open',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      Icon: Clock,
      textColor: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/tickets?status=Work+in+Progress',
    },
    {
      label: 'Closed / Resolved',
      value: stats.closed,
      Icon: CheckCircle2,
      textColor: 'text-green-600',
      bg: 'bg-green-50',
      href: '/tickets?status=Closed',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="rounded-xl bg-gradient-to-r from-[#003087] to-[#004BB4] p-6 text-white shadow">
        <p className="text-blue-200 text-sm mb-1">Welcome back,</p>
        <h1 className="text-2xl font-bold">{user.displayName}</h1>
        <p className="text-blue-200 text-sm mt-1">{user.company}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, Icon, textColor, bg, href }) => (
          <Link
            key={label}
            href={href}
            className={`rounded-xl ${bg} border border-gray-100 p-5 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all block`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <Icon className={`h-5 w-5 ${textColor}`} />
            </div>
            <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/tickets/create"
          className="group flex items-center gap-4 rounded-xl bg-white border border-gray-200 p-5 shadow-sm hover:border-[#003087] hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003087] text-white group-hover:scale-105 transition-transform">
            <PlusCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Create New Ticket</p>
            <p className="text-sm text-gray-500">Submit a new support request</p>
          </div>
        </Link>

        <Link
          href="/tickets"
          className="group flex items-center gap-4 rounded-xl bg-white border border-gray-200 p-5 shadow-sm hover:border-[#003087] hover:shadow-md transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-[#003087] group-hover:scale-105 transition-transform">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">View My Tickets</p>
            <p className="text-sm text-gray-500">Track your existing support requests</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
