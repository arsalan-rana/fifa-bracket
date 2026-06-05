import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.body as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const actor = await db.user.findUnique({ where: { email: session.user.email } });
  if (!actor) return res.status(404).json({ error: 'User not found' });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const isOwner = league.ownerId === actor.id;
  if (!isOwner && !isAdmin(session.user.email)) {
    return res.status(403).json({ error: 'Only the league owner or admin can delete this league' });
  }

  // Cascade deletes handle members, predictions, chips, leaderboard, activity logs
  await db.league.delete({ where: { id: leagueId } });

  return res.status(200).json({ success: true });
}
