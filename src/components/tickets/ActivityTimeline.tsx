import { formatDateTime } from '@/lib/utils';
import type { ActivityLog } from '@/types/ticket';
import { User, Bot } from 'lucide-react';

interface ActivityTimelineProps {
  logs: ActivityLog[];
}

export default function ActivityTimeline({ logs }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-500">No activity recorded yet.</p>;
  }

  return (
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
  );
}
