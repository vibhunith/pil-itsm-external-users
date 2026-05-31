import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import PortalShell from '@/components/layout/PortalShell';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');

  return <PortalShell user={user}>{children}</PortalShell>;
}
