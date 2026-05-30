import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSRConversations, addSRConversation, createSRActivityLog } from '@/lib/graph/serviceRequests';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const conversations = await getSRConversations(id);
  return NextResponse.json(conversations);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const message = (body.message ?? '').trim();
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  try {
    await addSRConversation({
      parentID: id,
      message,
      senderEmail: user.email,
      senderDisplayName: user.displayName,
    });

    const plainText = message.replace(/<[^>]+>/g, '').trim().slice(0, 500);
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      await createSRActivityLog({
        parentID: numericId,
        actor: user.displayName,
        activityDetails: plainText,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send message';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
