import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getTicketOwner } from '@/lib/graph/tickets';
import { getConversationsByTicket, addConversation } from '@/lib/graph/conversations';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ticket = await getTicketOwner(id);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (ticket.externalUserEmailID && ticket.externalUserEmailID !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const numericId = parseInt(ticket.id, 10);
    const conversations = isNaN(numericId) ? [] : await getConversationsByTicket(numericId);
    return NextResponse.json(conversations);
  } catch (err) {
    console.error('GET /api/tickets/[id]/conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const ticket = await getTicketOwner(id);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (ticket.externalUserEmailID && ticket.externalUserEmailID !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const numericId = parseInt(ticket.id, 10);
    await addConversation({
      numericTicketId: numericId,
      message: message.trim(),
      senderEmail: user.email,
      senderDisplayName: user.displayName,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tickets/[id]/conversations error:', err);
    return NextResponse.json({ error: 'Failed to post conversation' }, { status: 500 });
  }
}
