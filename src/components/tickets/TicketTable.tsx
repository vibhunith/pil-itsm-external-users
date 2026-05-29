'use client';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';
import { ArrowUpDown } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
}

const columns = [
  { key: 'incidentID', label: 'Ticket #' },
  { key: 'subject', label: 'Title' },
  { key: 'system', label: 'System' },
  { key: 'module', label: 'Module' },
  { key: 'subModule', label: 'Sub Module' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'impact', label: 'Impact' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'Created', label: 'Created' },
  { key: 'Modified', label: 'Last Updated' },
];

export default function TicketTable({
  tickets,
  total,
  page,
  pageSize,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
}: TicketTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-lg font-medium">No tickets found</p>
        <p className="text-sm mt-1">Try adjusting your filters or create a new ticket.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                onClick={() => onSort(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  <ArrowUpDown
                    className={`h-3 w-3 ${sortBy === col.key ? 'text-[#003087]' : 'text-gray-300'}`}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="hover:bg-blue-50/40 transition-colors cursor-pointer"
              onClick={() => window.location.href = `/tickets/${ticket.id}`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/tickets/${ticket.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-mono font-semibold text-[#003087] hover:underline"
                >
                  {ticket.incidentID}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate">
                {ticket.subject}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{ticket.system || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ticket.module || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ticket.subModule || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ticket.urgency || '—'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{ticket.impact || '—'}</td>
              <td className="px-4 py-3">
                {ticket.priority ? (
                  <Badge type="priority">{ticket.priority}</Badge>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge type="status">{ticket.status}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(ticket.created)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(ticket.modified)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-gray-100 px-4">
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onChange={onPageChange}
        />
      </div>
    </div>
  );
}
