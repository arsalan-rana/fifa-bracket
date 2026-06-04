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

  // Find the current user's DB id from the members list (they may not be a member)
  const currentMember = league.members.find((m) => m.user.email === session?.user?.email);
  const currentUserId = currentMember?.userId ?? session?.user?.id ?? '';

  return (
    <LeagueDashboard
      league={JSON.parse(JSON.stringify(league))}
      currentUserEmail={session?.user?.email ?? ''}
      isAdmin={adminMode}
      currentUserId={currentUserId}
    />
  );
}
