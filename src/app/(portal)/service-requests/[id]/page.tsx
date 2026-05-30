import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import ActivityTimelineSection from '@/components/tickets/ActivityTimelineSection';
import ConversationSection from '@/components/tickets/ConversationSection';
import { formatDate } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import { getSRById, getSRActivityLogs } from '@/lib/graph/serviceRequests';
import { ArrowLeft } from 'lucide-react';

export default async function ServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) return null;

  const { id } = await params;
  const sr = await getSRById(id);
  if (!sr) notFound();
  if (sr.email && sr.email.toLowerCase() !== user.email.toLowerCase()) notFound();

  const numericId = parseInt(id, 10);
  const activityLogs = isNaN(numericId) ? [] : await getSRActivityLogs(numericId);

  const infoRows = [
    { label: 'SR Number', value: sr.serviceID },
    { label: 'Status', value: <Badge type="status">{sr.status}</Badge> },
    { label: 'Service Type', value: sr.serviceType || '—' },
    { label: 'System', value: sr.system || '—' },
    { label: 'Category', value: sr.category || '—' },
    { label: 'Sub Category', value: sr.subCategory || '—' },
    { label: 'Urgency', value: sr.urgency || '—' },
    { label: 'Created Date', value: formatDate(sr.created) },
    { label: 'Last Updated', value: formatDate(sr.modified) },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/service-requests"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#003087] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          My Service Requests
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{sr.serviceID}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{sr.subject}</h1>
          <p className="text-sm text-gray-500 mt-1">Submitted on {formatDate(sr.created)}</p>
        </div>
        <Badge type="status">{sr.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: SR Info + Scope */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-700">Request Information</h2>
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

          {sr.scope && (
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-700">Scope of Request</h2>
              </div>
              <div className="p-5 text-sm text-gray-700 whitespace-pre-wrap">{sr.scope}</div>
            </div>
          )}
        </div>

        {/* Right: Conversation + Activity Timeline */}
        <div className="space-y-5">
          <ConversationSection
            ticketId={id}
            currentUserEmail={user.email}
            apiBase="/api/service-requests"
          />
          <ActivityTimelineSection
            ticketId={id}
            initialLogs={activityLogs}
            apiBase="/api/service-requests"
          />
        </div>
      </div>
    </div>
  );
}
