'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TicketTable from '@/components/tickets/TicketTable';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Ticket, TicketListResponse } from '@/types/ticket';
import { PlusCircle, Search, SlidersHorizontal, X, TicketCheck, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'Work in Progress', label: 'Work in Progress' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Rejected', label: 'Rejected' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

interface FilterState {
  status: string;
  priority: string;
  search: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

const DEFAULT_FILTERS: FilterState = {
  status: '',
  priority: '',
  search: '',
  sortBy: 'Created',
  sortDir: 'desc',
};

function storageKey(email: string) {
  return `pil_ticket_filters_${email}`;
}

function loadFilters(email: string, urlStatus: string): FilterState {
  if (urlStatus) return { ...DEFAULT_FILTERS, status: urlStatus };
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_FILTERS;
}

function saveFilters(email: string, filters: FilterState) {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(filters));
  } catch { /* ignore */ }
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            {['Ticket #', 'Title', 'System', 'Priority', 'Status', 'Created', 'Last Updated'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left">
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="bg-white">
              <td className="px-4 py-3"><div className="h-3 w-16 bg-gray-100 rounded" /></td>
              <td className="px-4 py-3"><div className="h-3 w-48 bg-gray-100 rounded" /></td>
              <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
              <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
              <td className="px-4 py-3"><div className="h-5 w-20 bg-gray-100 rounded-full" /></td>
              <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-100 rounded" /></td>
              <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-100 rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TicketsClient({ userEmail }: { userEmail: string }) {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') ?? '';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('Created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const pageSize = 10;

  useEffect(() => {
    const saved = loadFilters(userEmail, urlStatus);
    setStatusFilter(saved.status);
    setPriorityFilter(saved.priority);
    setSearch(saved.search);
    setSearchInput(saved.search);
    setSortBy(saved.sortBy);
    setSortDir(saved.sortDir);
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated || !userEmail) return;
    saveFilters(userEmail, { status: statusFilter, priority: priorityFilter, search, sortBy, sortDir });
  }, [statusFilter, priorityFilter, search, sortBy, sortDir, hydrated, userEmail]);

  const fetchTickets = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        orderBy: sortBy,
        orderDir: sortDir,
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: TicketListResponse = await res.json();
      setTickets(data.tickets);
      setTotal(data.total);
    } catch {
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, sortBy, sortDir, hydrated]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  function handleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
    setPage(1);
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function clearFilters() {
    setStatusFilter('');
    setPriorityFilter('');
    setSearch('');
    setSearchInput('');
    setSortBy('Created');
    setSortDir('desc');
    setPage(1);
  }

  const hasActiveFilters = statusFilter || priorityFilter || search;
  const activeFilterCount = [statusFilter, priorityFilter, search].filter(Boolean).length;

  // Quick stats from loaded data (while we have them)
  const openCount = tickets.filter((t) => t.status === 'Open').length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${total} ticket${total !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Link href="/tickets/create">
          <Button>
            <PlusCircle className="h-4 w-4" />
            Raise Issue
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filters</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#003087] text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
        <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="flex gap-2 col-span-1 sm:col-span-2">
            <Input
              placeholder="Search by ticket # or title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleSearch} size="md">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            placeholder="All Statuses"
          />
          <Select
            options={PRIORITY_OPTIONS}
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            placeholder="All Priorities"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        {error && <Alert message={error} className="m-4" />}
        {loading ? (
          <TableSkeleton />
        ) : (
          <TicketTable
            tickets={tickets}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            userEmail={userEmail}
          />
        )}
      </div>

      {/* Footer hint */}
      {!loading && tickets.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          Drag column headers to reorder · Click a header to sort · Click a row to view details
        </p>
      )}
    </div>
  );
}
