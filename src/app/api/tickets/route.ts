import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createTicket, getTicketsByUser, getDashboardStats } from '@/lib/graph/tickets';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '10', 10);
  const status = searchParams.get('status') ?? undefined;
  const priority = searchParams.get('priority') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const orderBy = searchParams.get('orderBy') ?? 'Created';
  const orderDir = (searchParams.get('orderDir') ?? 'desc') as 'asc' | 'desc';
  const stats = searchParams.get('stats') === 'true';

  try {
    if (stats) {
      const dashboardStats = await getDashboardStats(user.email);
      return NextResponse.json(dashboardStats);
    }

    const result = await getTicketsByUser(user.email, {
      page,
      pageSize,
      status,
      priority,
      search,
      orderBy,
      orderDir,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/tickets error:', err);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();

    const subject = formData.get('subject') as string;
    const system = formData.get('system') as string;
    const systemId = formData.get('systemId') as string | null;
    const module = formData.get('module') as string;
    const moduleId = formData.get('moduleId') as string | null;
    const subModule = formData.get('subModule') as string;
    const subModuleId = formData.get('subModuleId') as string | null;
    const urgency = formData.get('urgency') as string;
    const impact = formData.get('impact') as string;
    const issueDescription = formData.get('issueDescription') as string;

    if (!subject || !system || !module || !urgency || !impact || !issueDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const files: File[] = [];
    const rawFiles = formData.getAll('attachments');
    for (const f of rawFiles) {
      if (f instanceof File && f.size > 0) files.push(f);
    }

    const result = await createTicket(
      {
        subject, system, systemId: systemId ?? undefined,
        module, moduleId: moduleId ?? undefined,
        subModule, subModuleId: subModuleId ?? undefined,
        urgency: urgency as 'Critical' | 'High' | 'Medium' | 'Low',
        impact: impact as 'Critical' | 'High' | 'Medium' | 'Low',
        issueDescription,
      },
      user,
      files
    );

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err) {
    console.error('POST /api/tickets error:', err);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
