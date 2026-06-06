import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { ALL_FIXTURES, BONUS_QUESTIONS, getCurrentPhase } from '../../../data/fifa-2026';
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
      members: {
        include: { user: true },
        orderBy: { joinedAt: 'asc' },
      },
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

  // Progress counts for current phase
  const currentPhase = getCurrentPhase();
  const phaseFixtures = ALL_FIXTURES.filter((f) => f.phase === currentPhase);
  const totalBonus = BONUS_QUESTIONS.length;

  const [picksMade, bonusMade] = currentUserId
    ? await Promise.all([
        db.prediction.count({
          where: {
            leagueId: league.id,
            userId: currentUserId,
            matchNumber: { in: phaseFixtures.map((f) => f.matchNumber) },
          },
        }),
        db.bonusPrediction.count({
          where: { leagueId: league.id, userId: currentUserId },
        }),
      ])
    : [0, 0];

  return (
    <LeagueDashboard
      league={JSON.parse(JSON.stringify(league))}
      currentUserEmail={session?.user?.email ?? ''}
      isAdmin={adminMode}
      currentUserId={currentUserId}
      progress={{
        picks: picksMade,
        totalPicks: phaseFixtures.length,
        bonus: bonusMade,
        totalBonus,
      }}
    />
  );
}
