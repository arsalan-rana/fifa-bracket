import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { ALL_FIXTURES, isPhasePastDeadline } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') return res.status(400).json({ error: 'Missing leagueId' });

  const member = await db.leagueMember.findFirst({
    where: { leagueId, user: { email: session.user.email } },
  });
  if (!member) return res.status(403).json({ error: 'Not a league member' });

  const pastDeadlineMatchNumbers = ALL_FIXTURES
    .filter((f) => isPhasePastDeadline(f.phase))
    .map((f) => f.matchNumber);

  if (pastDeadlineMatchNumbers.length === 0) {
    return res.status(200).json({ picks: {} });
  }

  const predictions = await db.prediction.findMany({
    where: {
      leagueId,
      matchNumber: { in: pastDeadlineMatchNumbers },
      user: { memberships: { some: { leagueId } } },
    },
    include: { user: { select: { name: true, image: true, email: true } } },
  });

  type Picker = { name: string; image: string | null; email: string; goals1?: number | null; goals2?: number | null };
  const picks: Record<number, Record<string, Picker[]>> = {};
  const scores: Record<number, { name: string; image: string | null; goals1: number; goals2: number }[]> = {};

  for (const p of predictions) {
    if (!picks[p.matchNumber]) picks[p.matchNumber] = {};
    if (!picks[p.matchNumber][p.predictedWinner]) picks[p.matchNumber][p.predictedWinner] = [];
    picks[p.matchNumber][p.predictedWinner].push({
      name: p.user.name ?? p.user.email.split('@')[0],
      image: p.user.image,
      email: p.user.email,
      goals1: p.goals1,
      goals2: p.goals2,
    });
    if (p.goals1 !== null && p.goals2 !== null) {
      if (!scores[p.matchNumber]) scores[p.matchNumber] = [];
      scores[p.matchNumber].push({
        name: p.user.name ?? p.user.email.split('@')[0],
        image: p.user.image,
        goals1: p.goals1,
        goals2: p.goals2,
      });
    }
  }

  const fixtureResults = await db.fixtureResult.findMany({
    select: { matchNumber: true, result: true, goals1: true, goals2: true },
  });
  const results: Record<number, { result: string; goals1: number | null; goals2: number | null }> = {};
  for (const r of fixtureResults) {
    results[r.matchNumber] = { result: r.result, goals1: r.goals1, goals2: r.goals2 };
  }

  return res.status(200).json({ picks, scores, results });
}
