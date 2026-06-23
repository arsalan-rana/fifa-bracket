import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { ALL_FIXTURES, PHASES, TEAMS } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, userId } = req.query as { leagueId: string; userId: string };
  if (!leagueId || !userId) return res.status(400).json({ error: 'leagueId and userId required' });

  // Requester must be a league member
  const requester = await db.user.findUnique({ where: { email: session.user.email } });
  if (!requester) return res.status(401).json({ error: 'Unauthorized' });

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: requester.id } },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });

  const [predictions, allLeaguePredictions, fixtureResults, members, userChips] = await Promise.all([
    db.prediction.findMany({ where: { userId, leagueId } }),
    db.prediction.findMany({ where: { leagueId } }),
    db.fixtureResult.findMany(),
    db.leagueMember.findMany({ where: { leagueId }, select: { userId: true } }),
    db.chipUsage.findMany({ where: { userId, leagueId } }),
  ]);

  // Pool denominator must only include current members (same as leaderboard calc)
  const memberUserIds = new Set(members.map(m => m.userId));
  const memberPredictions = allLeaguePredictions.filter(p => memberUserIds.has(p.userId));

  const resultMap = new Map(fixtureResults.map(r => [r.matchNumber, r.result]));
  const scoreResultMap = new Map(
    fixtureResults
      .filter(r => r.goals1 !== null && r.goals2 !== null)
      .map(r => [r.matchNumber, { goals1: r.goals1!, goals2: r.goals2! }])
  );

  // Build pool share lookup: matchNumber → points earned if correct
  const poolByMatch = new Map<number, number>();
  for (const fixture of ALL_FIXTURES) {
    const result = resultMap.get(fixture.matchNumber);
    if (!result) continue;
    const phase = PHASES.find(p => p.id === fixture.phase);
    if (!phase || phase.scoringType !== 'pool') continue;
    const correctCount = memberPredictions.filter(
      p => p.matchNumber === fixture.matchNumber && p.predictedWinner === result
    ).length;
    poolByMatch.set(fixture.matchNumber, correctCount > 0 ? (phase.poolPoints ?? 80) / correctCount : 0);
  }

  const predMap = new Map(predictions.map(p => [p.matchNumber, p]));

  // Sort fixtures by date
  const sortedFixtures = [...ALL_FIXTURES].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let cumulative = 0;
  const picks = sortedFixtures.map(fixture => {
    const pred = predMap.get(fixture.matchNumber);
    const result = resultMap.get(fixture.matchNumber) ?? null;
    const correct = result !== null && pred ? pred.predictedWinner === result : null;
    const chip = userChips.find(c => c.matchNumber === fixture.matchNumber && c.phase === fixture.phase);
    const chipType = chip?.chipType ?? null;
    const multiplier = chipType === 'banker' ? 3 : chipType === 'doubleUp' ? 2 : 1;
    const baseShare = poolByMatch.get(fixture.matchNumber) ?? 0;
    const pickPoints = correct ? Math.floor(baseShare * multiplier) : 0;

    const actualScore = scoreResultMap.get(fixture.matchNumber) ?? null;
    const predictedGoals1 = pred?.goals1 ?? null;
    const predictedGoals2 = pred?.goals2 ?? null;
    const scoreCorrect =
      actualScore !== null && predictedGoals1 !== null && predictedGoals2 !== null
        ? predictedGoals1 === actualScore.goals1 && predictedGoals2 === actualScore.goals2
        : null;
    const scorePoints = scoreCorrect ? 15 : 0;

    const pointsEarned = pickPoints + scorePoints;
    cumulative += pointsEarned;

    const t1 = TEAMS[fixture.team1];
    const t2 = TEAMS[fixture.team2];

    return {
      matchNumber: fixture.matchNumber,
      phase: fixture.phase,
      team1: fixture.team1,
      team1Name: t1?.name ?? fixture.team1,
      team1Flag: t1?.flag ?? '',
      team2: fixture.team2,
      team2Name: t2?.name ?? fixture.team2,
      team2Flag: t2?.flag ?? '',
      date: fixture.date,
      predictedWinner: pred?.predictedWinner ?? null,
      predictedGoals1,
      predictedGoals2,
      submittedAt: pred?.submittedAt?.toISOString() ?? null,
      isLate: pred?.isLate ?? false,
      chipType,
      actualResult: result,
      actualGoals1: actualScore?.goals1 ?? null,
      actualGoals2: actualScore?.goals2 ?? null,
      correct,
      scoreCorrect,
      pickPoints,
      scorePoints,
      pointsEarned,
      cumulative,
    };
  });

  return res.status(200).json({ picks });
}
