import { db } from './db';
import { PHASES, ALL_FIXTURES, TOURNAMENT, BONUS_QUESTIONS, type Phase } from '../data/fifa-2026';
import { calcGroupPoints, calcPoolPoints, calcBonusPoints } from './tournament';

export async function refreshLeagueLeaderboard(leagueId: string): Promise<number> {
  const [members, fixtureResults, bonusAnswers] = await Promise.all([
    db.leagueMember.findMany({ where: { leagueId }, include: { user: true } }),
    db.fixtureResult.findMany(),
    db.bonusAnswer.findMany(),
  ]);

  const allPredictions = await db.prediction.findMany({ where: { leagueId } });

  const entries = await Promise.all(
    members.map(async (member) => {
      const userPredictions = allPredictions.filter((p) => p.userId === member.userId);
      const [userChips, userBonus] = await Promise.all([
        db.chipUsage.findMany({ where: { userId: member.userId, leagueId } }),
        db.bonusPrediction.findMany({ where: { userId: member.userId, leagueId } }),
      ]);

      const results = fixtureResults.map((r) => ({ matchNumber: r.matchNumber, result: r.result }));
      const allPredForPool = allPredictions.map((p) => ({
        matchNumber: p.matchNumber,
        predictedWinner: p.predictedWinner,
        userId: p.userId,
      }));
      const chips = userChips.map((c) => ({ matchNumber: c.matchNumber, chipType: c.chipType, phase: c.phase }));

      const groupPhase = PHASES.find((p) => p.id === 'group')!;
      const groupPoints = groupPhase.scoringType === 'pool'
        ? calcPoolPoints(
            userPredictions.map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner })),
            results,
            allPredForPool,
            chips,
            'group',
            groupPhase.poolPoints ?? 80
          )
        : calcGroupPoints(
            userPredictions.map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner })),
            results,
            chips,
            groupPhase.fixedPoints ?? 5
          );

      const knockoutPhases: Phase[] = ['round32', 'round16', 'quarter', 'semi', 'final'];
      const knockoutPoints: Record<string, number> = {};
      for (const phase of knockoutPhases) {
        const phaseConfig = PHASES.find((p) => p.id === phase)!;
        knockoutPoints[phase] = calcPoolPoints(
          userPredictions.map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner })),
          results,
          allPredForPool,
          chips,
          phase,
          phaseConfig.poolPoints ?? 100
        );
      }

      const bonusPoints = calcBonusPoints(
        userBonus.map((b) => ({ questionId: b.questionId, answer: b.answer })),
        bonusAnswers.map((a) => ({ questionId: a.questionId, answer: a.answer })),
        BONUS_QUESTIONS
      );

      const penalty = userPredictions.filter((p) => p.isLate).length * TOURNAMENT.scoring.latePenaltyPerDay;

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

  const sorted = entries.sort((a, b) => b.totalPoints - a.totalPoints);
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

  return sorted.length;
}
