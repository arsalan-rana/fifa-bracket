import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.query as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });

  const entries = await db.leaderboardEntry.findMany({
    where: { leagueId },
    include: { user: { select: { name: true, email: true, image: true } } },
    orderBy: { rank: 'asc' },
  });

  return res.status(200).json({ entries });
}
