'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { formatDate } from '@/lib/utils';
import type { Ticket } from '@/types/ticket';
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Paperclip, ChevronRight } from 'lucide-react';

interface TicketTableProps {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
  userEmail: string;
}

const DEFAULT_COLUMNS = [
  { key: 'incidentID', label: 'Ticket #', sortable: true },
  { key: 'subject', label: 'Title', sortable: true },
  { key: 'system', label: 'System', sortable: false },
  { key: 'module', label: 'Module', sortable: false },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'Created', label: 'Created', sortable: true },
  { key: 'Modified', label: 'Last Updated', sortable: true },
];

function columnStorageKey(email: string) {
  return `pil_ticket_columns_${email}`;
}

function loadColumns(email: string) {
  try {
    const raw = localStorage.getItem(columnStorageKey(email));
    if (!raw) return DEFAULT_COLUMNS;
    const keys: string[] = JSON.parse(raw);
    const ordered = keys
      .map((k) => DEFAULT_COLUMNS.find((c) => c.key === k))
      .filter(Boolean) as typeof DEFAULT_COLUMNS;
    const missing = DEFAULT_COLUMNS.filter((c) => !keys.includes(c.key));
    return [...ordered, ...missing];
  } catch {
    return DEFAULT_COLUMNS;
  }
}

function priorityDot(priority: string) {
  const p = priority?.toLowerCase();
  if (p === 'critical') return 'bg-red-500';
  if (p === 'high') return 'bg-orange-400';
  if (p === 'medium') return 'bg-amber-400';
  return 'bg-gray-300';
}

function getCellValue(ticket: Ticket, key: string) {
  switch (key) {
    case 'incidentID':
      return (
        <Link
          href={`/tickets/${ticket.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-xs font-semibold text-[#003087] hover:underline"
        >
          {ticket.incidentID}
        </Link>
      );
    case 'subject':
      return (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm text-gray-800 font-medium truncate max-w-[220px]">{ticket.subject}</span>
          {ticket.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />}
        </div>
      );
    case 'priority':
      if (!ticket.priority) return <span className="text-gray-300 text-sm">—</span>;
      return (
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${priorityDot(ticket.priority)}`} />
          <Badge type="priority">{ticket.priority}</Badge>
        </div>
      );
    case 'status':
      return <Badge type="status">{ticket.status}</Badge>;
    case 'Created':
      return <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(ticket.created)}</span>;
    case 'Modified':
      return <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(ticket.modified)}</span>;
    default:
      return (
        <span className="text-sm text-gray-600 truncate max-w-[140px] block">
          {(ticket as unknown as Record<string, unknown>)[key] as string || <span className="text-gray-300">—</span>}
        </span>
      );
  }
}

export default function TicketTable({
  tickets,
  total,
  page,
  pageSize,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
  userEmail,
}: TicketTableProps) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (userEmail) setColumns(loadColumns(userEmail));
  }, [userEmail]);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex.current = index;
    setDragOver(index);
  }

  function handleDrop() {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    const reordered = [...columns];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setColumns(reordered);
    try {
      localStorage.setItem(columnStorageKey(userEmail), JSON.stringify(reordered.map((c) => c.key)));
    } catch { /* ignore */ }
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDragOver(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    dragOverIndex.current = null;
    setDragOver(null);
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">No tickets found</p>
        <p className="text-xs mt-1 text-gray-400">Try adjusting your filters or raise a new issue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            {columns.map((col, index) => (
              <th
                key={col.key}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className={`px-4 py-2.5 text-left select-none group transition-colors ${dragOver === index ? 'bg-blue-50' : ''}`}
                style={{ cursor: 'grab' }}
              >
                <div className="flex items-center gap-1">
                  <GripVertical className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                  {col.sortable ? (
                    <button
                      onClick={() => onSort(col.key)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors"
                    >
                      {col.label}
                      {sortBy === col.key ? (
                        sortDir === 'asc'
                          ? <ArrowUp className="h-3 w-3 text-[#003087]" />
                          : <ArrowDown className="h-3 w-3 text-[#003087]" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-300 group-hover:text-gray-400" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{col.label}</span>
                  )}
                </div>
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              onClick={() => window.location.href = `/tickets/${ticket.id}`}
              className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {getCellValue(ticket, col.key)}
                </td>
              ))}
              <td className="pr-3">
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-gray-100 px-4 bg-white">
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
