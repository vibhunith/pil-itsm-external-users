import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getTicketById, getTicketAttachments, reopenTicket } from '@/lib/graph/tickets';
import { getActivityLogsByParentID, createActivityLog } from '@/lib/graph/activityLogs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const [ticket, attachments] = await Promise.all([
      getTicketById(id),
      getTicketAttachments(id),
    ]);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Security: only the ticket owner can view it
    if (ticket.externalUserEmailID && ticket.externalUserEmailID !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch activity logs using the numeric SharePoint item ID
    // The ticket id from Graph is the list item GUID; we need the numeric ID
    // It's stored in the incidentID-like index or we can parse from item fields
    const numericId = parseInt(ticket.id, 10);
    const activityLogs = isNaN(numericId) ? [] : await getActivityLogsByParentID(numericId);

    return NextResponse.json({ ticket, attachments, activityLogs });
  } catch (err) {
    console.error('GET /api/tickets/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json();

  if (action !== 'reopen') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const ticket = await getTicketById(id);
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (ticket.externalUserEmailID && ticket.externalUserEmailID !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const closedStatuses = ['Closed', 'Resolved', 'Rejected'];
    if (!closedStatuses.includes(ticket.status)) {
      return NextResponse.json({ error: 'Only Closed, Resolved, or Rejected tickets can be reopened.' }, { status: 400 });
    }

    await reopenTicket(id);

    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      await createActivityLog({
        parentID: numericId,
        actor: user.displayName,
        activityDetails: `Ticket reopened by ${user.displayName} (${user.email})\nPrevious status: ${ticket.status} → Open`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/tickets/[id] error:', err);
    return NextResponse.json({ error: 'Failed to reopen ticket' }, { status: 500 });
  }
}
