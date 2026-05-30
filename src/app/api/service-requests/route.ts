import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createServiceRequest, getSRsByUser } from '@/lib/graph/serviceRequests';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

  try {
    const result = await getSRsByUser(user.email, { page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    console.error('SR list error:', err);
    return NextResponse.json({ error: 'Failed to fetch service requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const serviceTypeName = formData.get('serviceTypeName') as string;
  const systemName = formData.get('systemName') as string;
  const categoryName = formData.get('categoryName') as string;
  const subCategoryName = (formData.get('subCategoryName') as string) || undefined;
  const subject = formData.get('subject') as string;
  const scope = formData.get('scope') as string;
  const urgency = formData.get('urgency') as string;

  if (!serviceTypeName || !systemName || !categoryName || !subject || !scope || !urgency) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const fileEntries = formData.getAll('attachments');
  const files: File[] = fileEntries.filter((f): f is File => f instanceof File && f.size > 0);

  try {
    const result = await createServiceRequest(
      { serviceTypeName, systemName, categoryName, subCategoryName, subject, scope, urgency },
      user,
      files
    );
    return NextResponse.json({ success: true, serviceID: result.serviceID });
  } catch (err) {
    console.error('Service request creation error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create service request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
