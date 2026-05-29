import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getModulesBySystemId } from '@/lib/graph/masters';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const systemId = req.nextUrl.searchParams.get('systemId');
  if (!systemId) return NextResponse.json({ error: 'systemId param required' }, { status: 400 });

  try {
    const modules = await getModulesBySystemId(systemId);
    return NextResponse.json(modules);
  } catch (err) {
    console.error('GET /api/masters/modules error:', err);
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}
