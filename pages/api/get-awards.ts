import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import { computeLeagueAwards } from '../../lib/awards';

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

  const admin = isAdmin(session.user.email);
  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  const canAccess = !!isMember || league.ownerId === user.id || admin;
  if (!canAccess) return res.status(403).json({ error: 'Not a league member' });

  // Non-admins can't see winners before the league owner reveals them
  if (!league.awardsRevealed && !admin) {
    return res.status(200).json({ revealed: false, isAdmin: admin });
  }

  const { categories, personalStats } = await computeLeagueAwards(leagueId);

  return res.status(200).json({
    revealed: league.awardsRevealed,
    isAdmin: admin,
    categories,
    myStats: personalStats[user.id] ?? null,
  });
}
