import { getSession } from '@/lib/auth/session';
import { getDashboardStats } from '@/lib/graph/tickets';
import { getSRDashboardStats } from '@/lib/graph/serviceRequests';
import Link from 'next/link';
import {
  PlusCircle, Ticket, Clock, CheckCircle2, AlertCircle,
  BarChart3, Headphones, ArrowRight, Wrench, FileText, ListChecks,
} from 'lucide-react';

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const [stats, srStats] = await Promise.all([
    getDashboardStats(user.email),
    getSRDashboardStats(user.email).catch(() => ({ total: 0, open: 0, inProgress: 0, closed: 0 })),
  ]);

  // ── Incident (Issue) stat cards — blue theme ──
  const ticketCards = [
    { label: 'Total Tickets', value: stats.total, Icon: BarChart3, color: 'text-[#003087]', bg: 'bg-blue-50', border: 'border-blue-100', href: '/tickets' },
    { label: 'Open', value: stats.open, Icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', href: '/tickets?status=Open' },
    { label: 'In Progress', value: stats.inProgress, Icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', href: '/tickets?status=Work+in+Progress' },
    { label: 'Closed / Resolved', value: stats.closed, Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', href: '/tickets?status=Closed' },
  ];

  // ── Service Request stat cards — violet theme (the visual distinction from incidents) ──
  const srCards = [
    { label: 'Total Requests', value: srStats.total, Icon: ListChecks, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: 'Open', value: srStats.open, Icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    { label: 'In Progress', value: srStats.inProgress, Icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Completed', value: srStats.closed, Icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
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
            This is your IT Service Management portal — raise issues, request new services,
            and track everything in one place.
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link
            href="/tickets/create"
            className="flex items-center justify-center gap-2 bg-[#003087] hover:bg-[#002060] text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Raise an Issue
          </Link>
          <Link
            href="/service-requests/create"
            className="flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            <Wrench className="h-4 w-4" />
            Raise a Service Request
          </Link>
        </div>
      </div>

      {/* ── Incident Requests ── */}
      <section>
        <div className="flex items-center justify-between mb-3 border-l-4 border-[#003087] pl-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#003087]">
              <Ticket className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Incident Requests</h2>
              <p className="text-xs text-gray-400">Report something that isn&apos;t working</p>
            </div>
          </div>
          <Link href="/tickets" className="flex items-center gap-1 text-xs font-semibold text-[#003087] hover:gap-2 transition-all">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ticketCards.map(({ label, value, Icon, color, bg, border, href }) => (
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
      </section>

      {/* ── Service Requests ── */}
      <section>
        <div className="flex items-center justify-between mb-3 border-l-4 border-violet-600 pl-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Wrench className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Service Requests</h2>
              <p className="text-xs text-gray-400">Request access, services, or new resources</p>
            </div>
          </div>
          <Link href="/service-requests" className="flex items-center gap-1 text-xs font-semibold text-violet-700 hover:gap-2 transition-all">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {srCards.map(({ label, value, Icon, color, bg, border }) => (
            <Link
              key={label}
              href="/service-requests"
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
      </section>

      {/* What you can do */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">What you can do</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { Icon: Headphones, title: 'Raise an Issue', desc: 'Log IT issues and get prompt support within the agreed SLA window.', href: '/tickets/create', cta: 'Generate Ticket', iconColor: 'text-[#003087]', iconBg: 'bg-blue-50' },
            { Icon: Ticket, title: 'Track Your Tickets', desc: 'View submitted issues, check status, SLA deadlines, and agent responses.', href: '/tickets', cta: 'View My Tickets', iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
            { Icon: Wrench, title: 'Request a Service', desc: 'Request access, software, cloud resources, or data-platform services.', href: '/service-requests/create', cta: 'Raise Request', iconColor: 'text-violet-700', iconBg: 'bg-violet-50' },
            { Icon: FileText, title: 'Track Your Requests', desc: 'Follow your service requests through review, fulfilment, and completion.', href: '/service-requests', cta: 'View My Requests', iconColor: 'text-fuchsia-600', iconBg: 'bg-fuchsia-50' },
          ].map(({ Icon, title, desc, href, cta, iconColor, iconBg }) => (
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

      {/* Issue vs Service Request — clarify the distinction */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Which one do I use?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-4 w-4 text-[#003087]" />
              <p className="font-semibold text-gray-800 text-sm">Incident Request (Issue)</p>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              Something is broken or not working as expected — an error, an outage, or degraded
              performance. Tracked against an SLA by urgency and impact.
            </p>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-violet-700" />
              <p className="font-semibold text-gray-800 text-sm">Service Request</p>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              You need something new — access to a system, software, cloud resources, or a
              data-platform service. Routed for review and fulfilment.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
