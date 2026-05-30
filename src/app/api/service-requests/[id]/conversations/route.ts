import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSRById, getSRConversations, addSRConversation, createSRActivityLog } from '@/lib/graph/serviceRequests';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sr = await getSRById(id);
  if (!sr) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Use TransactionalRequests item ID (index_ID) as parentID for conversations
  const conversations = sr.indexId > 0 ? await getSRConversations(String(sr.indexId)) : [];
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

  const sr = await getSRById(id);
  if (!sr) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    // Use TransactionalRequests item ID (index_ID) as parentID for both conversations and activity logs
    await addSRConversation({
      parentID: String(sr.indexId),
      message,
      senderEmail: user.email,
      senderDisplayName: user.displayName,
    });

    const plainText = message.replace(/<[^>]+>/g, '').trim().slice(0, 500);
    if (sr.indexId > 0) {
      await createSRActivityLog({
        parentID: sr.indexId,
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
