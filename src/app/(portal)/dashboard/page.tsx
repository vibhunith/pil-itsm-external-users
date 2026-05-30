import { getSession } from '@/lib/auth/session';
import { getDashboardStats } from '@/lib/graph/tickets';
import Link from 'next/link';
import {
  PlusCircle, Ticket, Clock, CheckCircle2, AlertCircle,
  BarChart3, Headphones, ArrowRight, ShieldCheck, MessageSquare,
} from 'lucide-react';

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const stats = await getDashboardStats(user.email);

  const statCards = [
    { label: 'Total Tickets', value: stats.total, Icon: BarChart3, color: 'text-[#003087]', bg: 'bg-blue-50', border: 'border-blue-100', href: '/tickets' },
    { label: 'Open', value: stats.open, Icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', href: '/tickets?status=Open' },
    { label: 'In Progress', value: stats.inProgress, Icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', href: '/tickets?status=Work+in+Progress' },
    { label: 'Closed / Resolved', value: stats.closed, Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', href: '/tickets?status=Closed' },
  ];

  const features = [
    {
      Icon: Headphones,
      title: 'Raise an Issue',
      desc: 'Log IT issues and get prompt support from our team within the agreed SLA window.',
      href: '/tickets/create',
      cta: 'Generate Ticket',
      iconColor: 'text-[#003087]',
      iconBg: 'bg-blue-50',
    },
    {
      Icon: Ticket,
      title: 'Track Your Tickets',
      desc: 'View all submitted requests, check status, SLA deadlines, and agent responses.',
      href: '/tickets',
      cta: 'View My Tickets',
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
    },
    {
      Icon: MessageSquare,
      title: 'Stay in the Loop',
      desc: 'Communicate with the support team, attach screenshots, and get real-time updates.',
      href: '/tickets',
      cta: 'Open a Ticket',
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
    },
    {
      Icon: ShieldCheck,
      title: 'SLA Guaranteed',
      desc: 'Every ticket is assigned a priority and tracked against SLA. Critical issues are escalated.',
      href: '/tickets',
      cta: 'View Tickets',
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Welcome banner */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-gray-400 text-xs mb-0.5 uppercase tracking-wide font-medium">Welcome back</p>
          <h1 className="text-xl font-bold text-gray-800">{user.displayName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user.company}</p>
          <p className="text-gray-500 text-sm mt-3 max-w-lg leading-relaxed">
            This is your IT Service Management portal — your single point of contact for raising issues,
            tracking support requests, and staying updated on resolutions.
          </p>
        </div>
        <Link
          href="/tickets/create"
          className="flex-shrink-0 flex items-center gap-2 bg-[#003087] hover:bg-[#002060] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Raise a Ticket
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, Icon, color, bg, border, href }) => (
          <Link
            key={label}
            href={href}
            className={`rounded-xl ${bg} border ${border} p-5 hover:shadow-md hover:scale-[1.02] transition-all block`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </Link>
        ))}
      </div>

      {/* What you can do */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">What you can do</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ Icon, title, desc, href, cta, iconColor, iconBg }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
              <Link href={href} className="flex items-center gap-1 text-[#003087] text-xs font-semibold hover:gap-2 transition-all">
                {cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Submit a Ticket', desc: 'Describe your issue, select the affected system and module, and set urgency.' },
            { step: '02', title: 'Team Reviews & Acts', desc: 'Our support agents are notified, assigned the ticket, and work within the SLA.' },
            { step: '03', title: 'Track & Get Resolved', desc: 'Receive updates through conversations, view the resolution note, and close the loop.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4">
              <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#003087] text-white text-xs font-bold">
                {step}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
