'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, ExternalLink, Lock, Loader2 } from 'lucide-react';

interface SimilarTicket {
  incidentID: string;
  subject: string;
  status: string;
  system: string;
  module: string;
  similarity: number;
  reason: string;
  owned: boolean;
  id: string;
}

interface Props {
  subject: string;
  issueDescription: string; // HTML; stripped server-side
  system?: string;
  module?: string;
  subModule?: string;
}

const DEBOUNCE_MS = 700;

function statusClasses(status: string): string {
  const s = status.toLowerCase();
  if (s === 'open') return 'bg-blue-50 text-blue-700';
  if (s === 'work in progress' || s === 'on hold') return 'bg-amber-50 text-amber-700';
  if (s === 'resolved' || s === 'closed') return 'bg-green-50 text-green-700';
  if (s === 'rejected') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

export default function SimilarTicketsPanel({ subject, issueDescription, system, module, subModule }: Props) {
  const [matches, setMatches] = useState<SimilarTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // The plain-text length we have to work with (subject + stripped description).
  const textLen = subject.trim().length + issueDescription.replace(/<[^>]+>/g, '').trim().length;

  useEffect(() => {
    if (disabled) return;
    if (textLen < 6) {
      setMatches([]);
      setSearched(false);
      return;
    }

    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch('/api/tickets/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, issueDescription, system, module, subModule }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (data.disabled) { setDisabled(true); return; }
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setSearched(true);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setMatches([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [subject, issueDescription, system, module, subModule, textLen, disabled]);

  // Stay out of the way until there is something worth showing.
  if (disabled || textLen < 6) return null;
  if (!loading && matches.length === 0 && !searched) return null;

  return (
    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 shadow-sm">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-blue-100">
        <Sparkles className="h-4 w-4 text-[#003087]" />
        <h3 className="text-sm font-semibold text-[#003087]">Related tickets</h3>
        {loading && <Loader2 className="h-3.5 w-3.5 text-[#003087] animate-spin ml-1" />}
        <span className="ml-auto text-[11px] text-gray-400">Matched from existing tickets</span>
      </div>

      <div className="p-3">
        {!loading && matches.length === 0 ? (
          <p className="px-2 py-3 text-sm text-gray-500">No related tickets found so far.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => {
              const inner = (
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[#003087]/5 text-[11px] font-bold text-[#003087]">
                    {m.similarity}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#003087]">{m.incidentID}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses(m.status)}`}>
                        {m.status}
                      </span>
                      {m.owned ? (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400" title="Your ticket — opens full detail in a new tab">
                          <ExternalLink className="h-3 w-3" /> open
                        </span>
                      ) : (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400" title="Raised by another user — opens a read-only resolution view in a new tab">
                          <Lock className="h-3 w-3" /> read-only
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium text-gray-800">{m.subject}</p>
                    {m.reason && <p className="mt-0.5 text-xs text-gray-500">{m.reason}</p>}
                  </div>
                </div>
              );

              // Own tickets open the full detail view; others open a read-only view
              // (resolution only — no activity, conversation, or attachments).
              // Open in a new tab so the half-filled ticket draft is preserved.
              const href = m.owned ? `/tickets/${m.id}` : `/tickets/${m.id}/readonly`;
              return (
                <li key={`${m.incidentID}-${m.similarity}`}>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-opacity hover:opacity-80"
                  >
                    {inner}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
