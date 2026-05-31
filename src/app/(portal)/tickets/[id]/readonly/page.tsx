import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { getTicketById } from '@/lib/graph/tickets';
import { ArrowLeft, CheckCircle2, Eye } from 'lucide-react';

// Read-only knowledge view of any ticket — used by the "Related tickets" suggestions so
// users can see how a similar issue was resolved. Deliberately omits the activity timeline,
// conversation thread, attachments, and requester identity. Unlike the full detail page,
// this is NOT owner-gated: any authenticated user may read a ticket's resolution here.
export default async function TicketReadOnlyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) return null;

  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const infoRows = [
    { label: 'Ticket Number', value: ticket.incidentID },
    { label: 'Status', value: <Badge type="status">{ticket.status}</Badge> },
    { label: 'Priority', value: ticket.priority ? <Badge type="priority">{ticket.priority}</Badge> : '—' },
    { label: 'Urgency', value: ticket.urgency || '—' },
    { label: 'Impact', value: ticket.impact || '—' },
    { label: 'System', value: ticket.system || '—' },
    { label: 'Module', value: ticket.module || '—' },
    { label: 'Sub Module', value: ticket.subModule || '—' },
    { label: 'Created Date', value: formatDate(ticket.created) },
    { label: 'Last Updated', value: formatDate(ticket.modified) },
  ];

  const hasResolution = Boolean(ticket.RCA || ticket.resolutionNote);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tickets/create"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#003087] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{ticket.incidentID}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{ticket.subject}</h1>
          <p className="text-sm text-gray-500 mt-1">Submitted on {formatDate(ticket.created)}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
          <Eye className="h-3.5 w-3.5" />
          Read-only
        </span>
      </div>

      {/* Ticket Info */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700">Ticket Information</h2>
        </div>
        <dl className="divide-y divide-gray-100">
          {infoRows.map(({ label, value }) => (
            <div key={label} className="flex items-center px-5 py-3 gap-4">
              <dt className="w-36 text-sm text-gray-500 flex-shrink-0">{label}</dt>
              <dd className="text-sm text-gray-800 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Issue Description */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700">Issue Description</h2>
        </div>
        <div
          className="p-5 prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: ticket.issueDescription || '<em>No description provided.</em>' }}
        />
      </div>

      {/* Resolution — the reason this view exists */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-green-50 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-green-800">Resolution</h2>
        </div>
        {hasResolution ? (
          <div className="divide-y divide-gray-100">
            {ticket.RCA && (
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Root Cause Analysis (RCA)
                </p>
                <p className="text-sm text-gray-800 font-medium">{ticket.RCA}</p>
              </div>
            )}
            {ticket.resolutionNote && (
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Resolution Description
                </p>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: ticket.resolutionNote }}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="p-5 text-sm text-gray-400">
            No resolution has been recorded for this ticket yet.
          </p>
        )}
      </div>
    </div>
  );
}
