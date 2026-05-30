'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Bot, User } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ActivityLog {
  id: string;
  parentID: number;
  actor: string;
  activityDetails: string;
  created: string;
}

interface Props {
  ticketId: string;
  initialLogs: ActivityLog[];
  apiBase?: string;
}

export default function ActivityTimelineSection({ ticketId, initialLogs, apiBase = '/api/tickets' }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${apiBase}/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activityLogs)) setLogs(data.activityLogs);
      }
    } finally {
      setRefreshing(false);
    }
  }, [ticketId]);

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Activity Timeline</h2>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-gray-400 hover:text-[#003087] transition-colors disabled:opacity-40"
          title="Refresh activity"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="p-5">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-3">
            {logs.map((log, i) => (
              <li key={log.id ?? i} className="mb-6 ml-6">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#003087] ring-4 ring-white">
                  {log.actor.toLowerCase() === 'system' ? (
                    <Bot className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-white" />
                  )}
                </span>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#003087]">{log.actor}</span>
                    <time className="text-xs text-gray-400">{formatDateTime(log.created)}</time>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{log.activityDetails}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
