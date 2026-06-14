import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.query as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  const canAccess = !!isMember || league.ownerId === user.id || isAdmin(session.user.email);
  if (!canAccess) return res.status(403).json({ error: 'Not a league member' });

  const [entries, members] = await Promise.all([
    db.leaderboardEntry.findMany({
      where: { leagueId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { rank: 'asc' },
    }),
    db.leagueMember.findMany({
      where: { leagueId },
      select: { userId: true, statusMessage: true, statusUpdatedAt: true },
    }),
  ]);

  const STATUS_TTL_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const statusMap = new Map(
    members
      .filter((m) => m.statusMessage && m.statusUpdatedAt && now - m.statusUpdatedAt.getTime() < STATUS_TTL_MS)
      .map((m) => [m.userId, m.statusMessage])
  );

  const enriched = entries.map((e) => ({
    ...e,
    statusMessage: statusMap.get(e.userId) ?? null,
  }));

  return res.status(200).json({ entries: enriched });
}
