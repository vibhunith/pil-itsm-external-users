import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getAllTicketsForMatching } from '@/lib/graph/tickets';
import {
  rankSimilarTickets,
  isSimilarTicketsEnabled,
  type CandidateTicket,
} from '@/lib/ai/similarTickets';
import type { Ticket } from '@/types/ticket';

export const runtime = 'nodejs';

// How many coarse-filtered candidates to send to the model (keeps token use bounded).
const MAX_CANDIDATES = 25;

/** A single suggested ticket returned to the client. */
interface SimilarTicketResult {
  incidentID: string;
  subject: string;
  status: string;
  system: string;
  module: string;
  similarity: number;
  reason: string;
  owned: boolean;
  // SharePoint item id. Drives the link target: own tickets open the full detail view,
  // others open a read-only view (resolution only, no activity/conversation/attachments).
  id: string;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'with', 'this', 'that',
  'have', 'has', 'was', 'were', 'when', 'why', 'how', 'unable', 'cannot', 'issue', 'error',
  'problem', 'please', 'help', 'need', 'from', 'into', 'getting', 'while', 'after', 'before',
]);

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): Set<string> {
  const tokens = (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(tokens);
}

// Cheap lexical + category relevance, used to narrow the full ticket list before the
// (more expensive) semantic ranking. Higher is more relevant.
function coarseScore(
  queryTokens: Set<string>,
  ctx: { system?: string; module?: string; subModule?: string },
  ticket: Ticket
): number {
  const ticketTokens = tokenize(`${ticket.subject} ${stripHtml(ticket.issueDescription)}`);
  let overlap = 0;
  for (const t of queryTokens) if (ticketTokens.has(t)) overlap++;

  let score = overlap;
  if (ctx.system && ticket.system && ctx.system.toLowerCase() === ticket.system.toLowerCase()) score += 3;
  if (ctx.module && ticket.module && ctx.module.toLowerCase() === ticket.module.toLowerCase()) score += 2;
  if (ctx.subModule && ticket.subModule && ctx.subModule.toLowerCase() === ticket.subModule.toLowerCase()) score += 1;
  return score;
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isSimilarTicketsEnabled()) {
    return NextResponse.json({ matches: [], disabled: true });
  }

  let body: { subject?: string; issueDescription?: string; system?: string; module?: string; subModule?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const subject = (body.subject ?? '').trim();
  const description = stripHtml(body.issueDescription ?? '');
  const ctx = { system: body.system, module: body.module, subModule: body.subModule };

  // Not enough signal yet — don't bother the model.
  if (subject.length < 6 && description.length < 6) {
    return NextResponse.json({ matches: [] });
  }

  try {
    const all = await getAllTicketsForMatching();

    const queryTokens = tokenize(`${subject} ${description}`);
    const scored = all
      .filter((t) => t.subject?.trim())
      .map((t) => ({ ticket: t, score: coarseScore(queryTokens, ctx, t) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);

    if (!scored.length) return NextResponse.json({ matches: [] });

    const candidates: CandidateTicket[] = scored.map(({ ticket }) => ({
      ref: ticket.id,
      subject: ticket.subject,
      description: stripHtml(ticket.issueDescription),
      system: ticket.system,
      module: ticket.module,
      subModule: ticket.subModule,
      status: ticket.status,
    }));

    const ranked = await rankSimilarTickets({ subject, description, ...ctx }, candidates);

    const byId = new Map(scored.map(({ ticket }) => [ticket.id, ticket]));
    const email = user.email.toLowerCase();

    const matches: SimilarTicketResult[] = ranked
      .map((m) => {
        const t = byId.get(m.ref);
        if (!t) return null;
        const owned = (t.externalUserEmailID ?? '').toLowerCase() === email;
        const result: SimilarTicketResult = {
          incidentID: t.incidentID,
          subject: t.subject,
          status: t.status,
          system: t.system,
          module: t.module,
          similarity: m.similarity,
          reason: m.reason,
          owned,
          id: t.id,
        };
        return result;
      })
      .filter((m): m is SimilarTicketResult => m !== null);

    return NextResponse.json({ matches });
  } catch (err) {
    console.error('POST /api/tickets/similar error:', err);
    return NextResponse.json({ error: 'Failed to find similar tickets' }, { status: 500 });
  }
}
