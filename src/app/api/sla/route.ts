import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findMatchingSLAPolicy } from '@/lib/graph/sla';
import { calculateSLA } from '@/lib/sla/calculator';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const urgency = req.nextUrl.searchParams.get('urgency');
  const impact = req.nextUrl.searchParams.get('impact');

  if (!urgency || !impact) {
    return NextResponse.json({ error: 'urgency and impact params required' }, { status: 400 });
  }

  try {
    const policy = await findMatchingSLAPolicy(urgency, impact);
    if (!policy) {
      return NextResponse.json({ policy: null, sla: null });
    }

    const sla = calculateSLA({
      operationalHours: policy.operationalHours,
      respondWithinHours: policy.respondWithinHours,
      resolveWithinHours: policy.resolveWithinHours,
    });

    return NextResponse.json({ policy, sla });
  } catch (err) {
    console.error('GET /api/sla error:', err);
    return NextResponse.json({ error: 'Failed to fetch SLA' }, { status: 500 });
  }
}
