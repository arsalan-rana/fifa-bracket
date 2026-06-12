import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { ALL_FIXTURES } from '../../data/fifa-2026';
import type { Phase } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, phase } = req.query as { leagueId: string; phase: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });
  if (!phase) return res.status(400).json({ error: 'phase required' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });

  // Get match numbers for the requested phase
  const phaseMatchNumbers = ALL_FIXTURES
    .filter((f) => f.phase === (phase as Phase))
    .map((f) => f.matchNumber);

  const predictions = await db.prediction.findMany({
    where: {
      leagueId,
      matchNumber: { in: phaseMatchNumbers },
      user: { memberships: { some: { leagueId } } },
    },
    select: {
      matchNumber: true,
      predictedWinner: true,
    },
  });

  // Group by matchNumber → { teamCode: count }
  const picks: Record<number, Record<string, number>> = {};
  for (const p of predictions) {
    if (!picks[p.matchNumber]) picks[p.matchNumber] = {};
    picks[p.matchNumber][p.predictedWinner] = (picks[p.matchNumber][p.predictedWinner] ?? 0) + 1;
  }

  return res.status(200).json({ picks });
}
