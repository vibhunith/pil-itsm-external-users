import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSRById, getSRActivityLogs } from '@/lib/graph/serviceRequests';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sr = await getSRById(id);
  if (!sr) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (sr.email && sr.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const activityLogs = sr.indexId > 0 ? await getSRActivityLogs(sr.indexId) : [];

  return NextResponse.json({ sr, activityLogs });
}
