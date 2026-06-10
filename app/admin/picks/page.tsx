import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../../lib/auth';
import { db } from '../../../lib/db';
import AdminPicksPanel from './AdminPicksPanel';

export const metadata = { title: 'Admin — All Picks | WC26' };

export default async function AdminPicksPage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) notFound();

  const leagues = await db.league.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'desc' },
  });

  return <AdminPicksPanel leagues={leagues} />;
}
