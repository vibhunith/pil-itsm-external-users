import { getSession } from '@/lib/auth/session';
import { Suspense } from 'react';
import TicketsClient from './TicketsClient';

export default async function TicketsPage() {
  const user = await getSession();
  return (
    <Suspense>
      <TicketsClient userEmail={user?.email ?? ''} />
    </Suspense>
  );
}
