import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <Sidebar />
      <main className="ml-[88px] pt-14">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
