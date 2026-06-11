import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { getFixture } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, matchNumber, goals1, goals2 } = req.body as {
    leagueId: string;
    matchNumber: number;
    goals1: number;
    goals2: number;
  };

  if (!leagueId || !matchNumber || goals1 == null || goals2 == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!Number.isInteger(goals1) || !Number.isInteger(goals2) || goals1 < 0 || goals2 < 0 || goals1 > 20 || goals2 > 20) {
    return res.status(400).json({ error: 'Invalid score values' });
  }

  const fixture = getFixture(matchNumber);
  if (!fixture) return res.status(400).json({ error: 'Invalid match number' });
  if (new Date(fixture.date) <= new Date()) {
    return res.status(400).json({ error: 'Match has already started' });
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });

  const existing = await db.prediction.findUnique({
    where: { userId_leagueId_matchNumber: { userId: user.id, leagueId, matchNumber } },
  });
  if (!existing) return res.status(400).json({ error: 'Submit your winner pick first' });

  await db.prediction.update({
    where: { userId_leagueId_matchNumber: { userId: user.id, leagueId, matchNumber } },
    data: { goals1, goals2 },
  });

  return res.status(200).json({ success: true });
}
