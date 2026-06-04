import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../../lib/auth';
import { db } from '../../../lib/db';
import LeagueDashboard from './LeagueDashboard';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LeaguePage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  const league = await db.league.findUnique({
    where: { slug },
    include: {
      members: { include: { user: true }, orderBy: { joinedAt: 'asc' } },
      leaderboard: {
        include: { user: true },
        orderBy: { rank: 'asc' },
        take: 5,
      },
      activityLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!league) notFound();

  const adminMode = isAdmin(session?.user?.email);

  return (
    <LeagueDashboard
      league={JSON.parse(JSON.stringify(league))}
      currentUserEmail={session?.user?.email ?? ''}
      isAdmin={adminMode}
    />
  );
}
