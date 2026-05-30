import { NextRequest, NextResponse } from 'next/server';
import { getCategorization } from '@/lib/graph/serviceRequests';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const parentId = searchParams.get('parentId') ?? undefined;

  if (!type) {
    return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
  }

  try {
    const items = await getCategorization(type, parentId);
    console.log(`Categorization API: type=${type} parentId=${parentId} → ${items.length} items`);
    return NextResponse.json(items);
  } catch (err) {
    console.error('Categorization API error:', err);
    return NextResponse.json({ error: 'Failed to fetch categorization data' }, { status: 500 });
  }
}
