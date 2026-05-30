import Link from 'next/link';
import { Wrench, ChevronRight } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getSRsByUser } from '@/lib/graph/serviceRequests';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export default async function ServiceRequestsPage() {
  const user = await getSession();
  if (!user) return null;

  const { items } = await getSRsByUser(user.email, { page: 1, pageSize: 50 });

  const urgencyColor: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">My Service Requests</h1>
          <p className="text-sm text-gray-500">Track and manage your IT service requests</p>
        </div>
        <Link
          href="/service-requests/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#002070] transition-colors"
        >
          <Wrench className="h-4 w-4" />
          Raise Service Request
        </Link>
      </div>

      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Wrench className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">No service requests yet</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              You have not raised any service requests. Use the button above to get started.
            </p>
            <Link
              href="/service-requests/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#002070] transition-colors"
            >
              Raise Service Request
            </Link>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">{items.length} request{items.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((sr) => (
                <Link
                  key={sr.id}
                  href={`/service-requests/${sr.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#003087]">{sr.serviceID}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{sr.serviceType}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{sr.subject}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {sr.system && (
                        <span className="text-xs text-gray-500">{sr.system}</span>
                      )}
                      {sr.category && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{sr.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sr.urgency && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgencyColor[sr.urgency] ?? 'bg-gray-100 text-gray-600'}`}>
                        {sr.urgency}
                      </span>
                    )}
                    <Badge type="status">{sr.status}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(sr.created)}</span>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
