import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import {
  PHASES,
  GROUP_FIXTURES,
  ALL_FIXTURES,
  TOURNAMENT,
  BONUS_QUESTIONS,
  type Phase,
} from '../../data/fifa-2026';
import { calcGroupPoints, calcPoolPoints, calcBonusPoints } from '../../lib/tournament';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin(session.user.email)) return res.status(403).json({ error: 'Admin only' });

  const { leagueId } = req.body as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  try {
    // Load all data
    const [members, fixtureResults, bonusAnswers] = await Promise.all([
      db.leagueMember.findMany({ where: { leagueId }, include: { user: true } }),
      db.fixtureResult.findMany(),
      db.bonusAnswer.findMany(),
    ]);

    const allPredictions = await db.prediction.findMany({ where: { leagueId } });

    const entries = await Promise.all(
      members.map(async (member) => {
        const userPredictions = allPredictions.filter((p) => p.userId === member.userId);
        const userChips = await db.chipUsage.findMany({
          where: { userId: member.userId, leagueId },
        });
        const userBonus = await db.bonusPrediction.findMany({
          where: { userId: member.userId, leagueId },
        });

        const results = fixtureResults.map((r) => ({ matchNumber: r.matchNumber, result: r.result }));
        const allPredForPool = allPredictions.map((p) => ({
          matchNumber: p.matchNumber,
          predictedWinner: p.predictedWinner,
          userId: p.userId,
        }));

        // Group stage (fixed scoring)
        const groupPhase = PHASES.find((p) => p.id === 'group')!;
        const groupPoints = calcGroupPoints(
          userPredictions.map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner })),
          results,
          userChips.map((c) => ({ matchNumber: c.matchNumber, chipType: c.chipType, phase: c.phase })),
          groupPhase.fixedPoints ?? 5
        );

        // Knockout phases (pool scoring)
        const knockoutPhases: Phase[] = ['round32', 'round16', 'quarter', 'semi', 'final'];
        const knockoutPoints: Record<string, number> = {};

        for (const phase of knockoutPhases) {
          const phaseConfig = PHASES.find((p) => p.id === phase)!;
          knockoutPoints[phase] = calcPoolPoints(
            userPredictions.map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner })),
            results,
            allPredForPool,
            userChips.map((c) => ({ matchNumber: c.matchNumber, chipType: c.chipType, phase: c.phase })),
            phase,
            phaseConfig.poolPoints ?? 100
          );
        }

        // Bonus points
        const bonusPoints = calcBonusPoints(
          userBonus.map((b) => ({ questionId: b.questionId, answer: b.answer })),
          bonusAnswers.map((a) => ({ questionId: a.questionId, answer: a.answer })),
          BONUS_QUESTIONS,
        );

        // Late penalty
        const latePred = userPredictions.filter((p) => p.isLate);
        const penalty = latePred.length * TOURNAMENT.scoring.latePenaltyPerDay;

        const totalPoints =
          groupPoints +
          (knockoutPoints.round32 ?? 0) +
          (knockoutPoints.round16 ?? 0) +
          (knockoutPoints.quarter ?? 0) +
          (knockoutPoints.semi ?? 0) +
          (knockoutPoints.final ?? 0) +
          bonusPoints -
          penalty;

        return {
          userId: member.userId,
          totalPoints,
          groupPoints,
          round32Points: knockoutPoints.round32 ?? 0,
          round16Points: knockoutPoints.round16 ?? 0,
          quarterPoints: knockoutPoints.quarter ?? 0,
          semiPoints: knockoutPoints.semi ?? 0,
          finalPoints: knockoutPoints.final ?? 0,
          bonusPoints,
          penalty,
        };
      })
    );

    // Sort and assign ranks
    const sorted = entries.sort((a, b) => b.totalPoints - a.totalPoints);

    // Get previous ranks
    const prevEntries = await db.leaderboardEntry.findMany({ where: { leagueId } });
    const prevRankMap = new Map(prevEntries.map((e) => [e.userId, e.rank]));

    await db.$transaction(
      sorted.map((entry, idx) =>
        db.leaderboardEntry.upsert({
          where: { leagueId_userId: { leagueId, userId: entry.userId } },
          update: {
            rank: idx + 1,
            prevRank: prevRankMap.get(entry.userId) ?? null,
            totalPoints: entry.totalPoints,
            groupPoints: entry.groupPoints,
            round32Points: entry.round32Points,
            round16Points: entry.round16Points,
            quarterPoints: entry.quarterPoints,
            semiPoints: entry.semiPoints,
            finalPoints: entry.finalPoints,
            bonusPoints: entry.bonusPoints,
            penalty: entry.penalty,
            updatedAt: new Date(),
          },
          create: {
            leagueId,
            userId: entry.userId,
            rank: idx + 1,
            prevRank: null,
            totalPoints: entry.totalPoints,
            groupPoints: entry.groupPoints,
            round32Points: entry.round32Points,
            round16Points: entry.round16Points,
            quarterPoints: entry.quarterPoints,
            semiPoints: entry.semiPoints,
            finalPoints: entry.finalPoints,
            bonusPoints: entry.bonusPoints,
            penalty: entry.penalty,
          },
        })
      )
    );

    await db.activityLog.create({
      data: {
        leagueId,
        userId: null,
        eventType: 'leaderboard_refreshed',
        details: JSON.stringify({ updatedBy: session.user.email, count: sorted.length }),
      },
    });

    return res.status(200).json({ success: true, entries: sorted.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to refresh leaderboard' });
  }
}
