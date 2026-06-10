import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const memberships = await db.leagueMember.findMany({
    where: { userId: user.id },
    include: {
      league: {
        include: { _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const memberLeagueIds = new Set(memberships.map((m) => m.league.id));

  // Leagues the user owns but isn't a member of
  const ownedOnly = await db.league.findMany({
    where: {
      ownerId: user.id,
      ...(memberLeagueIds.size > 0 && { id: { notIn: [...memberLeagueIds] } }),
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Leaderboard rank for each member league
  const leaderboardEntries = memberLeagueIds.size > 0
    ? await db.leaderboardEntry.findMany({
        where: { userId: user.id, leagueId: { in: [...memberLeagueIds] } },
        select: { leagueId: true, rank: true, totalPoints: true },
      })
    : [];

  const rankMap: Record<string, { rank: number; totalPoints: number }> = Object.fromEntries(
    leaderboardEntries.map((e) => [e.leagueId, { rank: e.rank, totalPoints: e.totalPoints }])
  );

  const leagues = [
    ...memberships.map((m) => ({
      ...m.league,
      isMember: true,
      myRank: rankMap[m.league.id] ?? null,
    })),
    ...ownedOnly.map((l) => ({
      ...l,
      isMember: false,
      myRank: null,
    })),
  ];

  return res.status(200).json({ leagues });
}
