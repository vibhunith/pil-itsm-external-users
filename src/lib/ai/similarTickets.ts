import Anthropic from '@anthropic-ai/sdk';

// Semantic ranking of candidate tickets against a new ticket's context, powered by Claude.
// The model receives a small, pre-filtered candidate list (the route does the coarse
// keyword/category narrowing) and returns the genuinely related ones, ranked.

const MODEL = 'claude-opus-4-8';

/** Context for the ticket the user is currently drafting. */
export interface NewTicketContext {
  subject: string;
  description: string; // plain text (HTML already stripped by the caller)
  system?: string;
  module?: string;
  subModule?: string;
}

/** A historical ticket offered to the model as a match candidate. */
export interface CandidateTicket {
  ref: string; // opaque key the model echoes back (we use the SharePoint item id)
  subject: string;
  description: string;
  system?: string;
  module?: string;
  subModule?: string;
  status?: string;
}

export interface RankedMatch {
  ref: string;
  similarity: number; // 0-100
  reason: string;
}

/** True when the Claude integration is configured. When false the feature degrades to "no suggestions". */
export function isSimilarTicketsEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  return client;
}

const SYSTEM_PROMPT = `You rank existing IT support tickets by how relevant they are to a NEW ticket a user is drafting.

You are given the new ticket's context and a numbered list of candidate tickets. Decide which candidates describe the same or a closely related issue (same root cause, same system/module symptom, or a clear duplicate/follow-up).

Rules:
- Only return candidates that are genuinely relevant. It is correct to return an empty list when nothing is a good match.
- similarity is an integer 0-100 reflecting how related the candidate is to the new ticket. Only include candidates scoring 55 or higher.
- Rank results from most to least relevant. Return at most 6.
- reason: one short sentence (max ~140 chars) explaining the connection, based on the subject and category similarity. Do NOT quote private or sensitive details from a candidate's description; keep it about why the two relate.
- ref must be copied verbatim from the candidate you are referring to.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          similarity: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['ref', 'similarity', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['matches'],
  additionalProperties: false,
} as const;

function truncate(s: string, max: number): string {
  const t = (s ?? '').trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

function buildUserMessage(newTicket: NewTicketContext, candidates: CandidateTicket[]): string {
  const ctx = {
    subject: truncate(newTicket.subject, 250),
    description: truncate(newTicket.description, 600),
    system: newTicket.system || undefined,
    module: newTicket.module || undefined,
    subModule: newTicket.subModule || undefined,
  };
  const cand = candidates.map((c) => ({
    ref: c.ref,
    subject: truncate(c.subject, 250),
    description: truncate(c.description, 400),
    system: c.system || undefined,
    module: c.module || undefined,
    subModule: c.subModule || undefined,
    status: c.status || undefined,
  }));
  return [
    'NEW TICKET (being drafted):',
    JSON.stringify(ctx, null, 2),
    '',
    'CANDIDATE TICKETS:',
    JSON.stringify(cand, null, 2),
  ].join('\n');
}

/** Ask Claude to rank the candidates. Returns [] on any failure so the feature never blocks ticket creation. */
export async function rankSimilarTickets(
  newTicket: NewTicketContext,
  candidates: CandidateTicket[]
): Promise<RankedMatch[]> {
  if (!candidates.length || !isSimilarTicketsEnabled()) return [];

  try {
    // No prompt caching here: the candidate list and new-ticket context change on every
    // request, and the stable instruction prefix is well below the model's cacheable minimum.
    const res = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      // Ranking is a fast, scoped task — keep latency/cost low and skip thinking.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [{ role: 'user', content: buildUserMessage(newTicket, candidates) }],
    });

    if (res.stop_reason === 'refusal') return [];

    const text = res.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return [];

    const parsed = JSON.parse(text.text) as { matches?: RankedMatch[] };
    const valid = new Set(candidates.map((c) => c.ref));
    return (parsed.matches ?? [])
      .filter((m) => m && valid.has(m.ref) && typeof m.similarity === 'number')
      .sort((a, b) => b.similarity - a.similarity);
  } catch (err) {
    console.error('rankSimilarTickets error:', err);
    return [];
  }
}
