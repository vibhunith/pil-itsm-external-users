import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { getSubModulesByModule } from '@/lib/graph/masters';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const moduleId = req.nextUrl.searchParams.get('moduleId');
  if (!moduleId) return NextResponse.json({ error: 'moduleId param required' }, { status: 400 });

  try {
    const subModules = await getSubModulesByModule(moduleId);
    return NextResponse.json(subModules);
  } catch (err) {
    console.error('GET /api/masters/submodules error:', err);
    return NextResponse.json({ error: 'Failed to fetch submodules' }, { status: 500 });
  }
}
