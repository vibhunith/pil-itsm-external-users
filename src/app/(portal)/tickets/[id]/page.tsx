import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import ActivityTimelineSection from '@/components/tickets/ActivityTimelineSection';
import ConversationSection from '@/components/tickets/ConversationSection';
import { formatDate, formatDateTime } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { getTicketById, getTicketAttachments } from '@/lib/graph/tickets';
import { getActivityLogsByParentID } from '@/lib/graph/activityLogs';
import { ArrowLeft, Paperclip, Download, Clock, Calendar, CheckCircle2 } from 'lucide-react';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) return null;

  const { id } = await params;
  const [ticket, attachments] = await Promise.all([
    getTicketById(id),
    getTicketAttachments(id),
  ]);

  if (!ticket) notFound();
  if (ticket.externalUserEmailID && ticket.externalUserEmailID !== user.email) notFound();

  // Get activity logs — parentID is the numeric SharePoint item ID stored in index_ID or similar
  // We fetch by numeric list item ID which SharePoint returns as item.id (GUID); use a workaround
  // by querying activity logs directly by parentID if we can extract numeric id
  const numericId = parseInt(ticket.id, 10);
  const activityLogs = isNaN(numericId) ? [] : await getActivityLogsByParentID(numericId);

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

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/tickets"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#003087] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          My Tickets
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{ticket.incidentID}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{ticket.subject}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submitted on {formatDate(ticket.created)}
          </p>
        </div>
        <Badge type="status">{ticket.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Details + Description + Attachments */}
        <div className="lg:col-span-2 space-y-5">
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

          {/* SLA Clocks */}
          {(ticket.initialResponseClockSLA || ticket.initialResolutionClockSLA) && (
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-700">SLA Deadlines</h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ticket.initialResponseClockSLA && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Initial Response By</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatDateTime(ticket.initialResponseClockSLA)}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.initialResolutionClockSLA && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Resolution Deadline</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {formatDateTime(ticket.initialResolutionClockSLA)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Attachments */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-500" />
              <h2 className="font-semibold text-gray-700">
                Attachments {attachments.length > 0 && `(${attachments.length})`}
              </h2>
            </div>
            {attachments.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No attachments uploaded.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {attachments.map((att) => (
                  <li key={att.name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{att.name}</span>
                    </div>
                    <a
                      href={att.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#003087] hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Resolution — shown only when populated by the support team */}
          {(ticket.RCA || ticket.resolutionNote) && (
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-green-50 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <h2 className="font-semibold text-green-800">Resolution</h2>
              </div>
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
            </div>
          )}
        </div>

        {/* Right: Conversation + Activity Timeline */}
        <div className="space-y-5">
          <ConversationSection ticketId={id} currentUserEmail={user.email} />

          <ActivityTimelineSection ticketId={id} initialLogs={activityLogs} />
        </div>
      </div>
    </div>
  );
}
