import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSystems } from '@/lib/graph/masters';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const systems = await getSystems();
    return NextResponse.json(systems);
  } catch (err) {
    console.error('GET /api/masters/systems error:', err);
    return NextResponse.json({ error: 'Failed to fetch systems' }, { status: 500 });
  }
}
