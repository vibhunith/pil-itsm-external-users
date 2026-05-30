'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';

interface Props {
  ticketId: string;
  status: string;
}

const REOPENABLE = ['Closed', 'Resolved', 'Rejected'];

export default function ReopenTicketButton({ ticketId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!REOPENABLE.includes(status)) return null;

  async function handleReopen() {
    if (!confirm('Reopen this ticket? Its status will be set back to Open.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to reopen ticket.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleReopen}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-lg border border-[#003087] px-3 py-1.5 text-sm font-medium text-[#003087] hover:bg-[#003087] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : <RotateCcw className="h-3.5 w-3.5" />
        }
        Reopen Ticket
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
