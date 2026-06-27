import { db } from './db';
import { PHASES, ALL_FIXTURES, TOURNAMENT, BONUS_QUESTIONS, getPhaseConfig, type Phase } from '../data/fifa-2026';
import { calcGroupPoints, calcPoolPoints, calcBonusPoints, computeClosestWinners } from './tournament';

function computeStreak(
  userPredictions: { matchNumber: number; predictedWinner: string }[],
  results: { matchNumber: number; result: string }[],
): number {
  const predMap = new Map(userPredictions.map((p) => [p.matchNumber, p.predictedWinner]));
  const resultMap = new Map(results.map((r) => [r.matchNumber, r.result]));
  const playedFixtures = ALL_FIXTURES
    .filter((f) => resultMap.has(f.matchNumber))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  for (const fixture of playedFixtures) {
    const pick = predMap.get(fixture.matchNumber);
    if (!pick || pick !== resultMap.get(fixture.matchNumber)) break;
    streak++;
  }
  return streak;
}

export async function refreshLeagueLeaderboard(leagueId: string): Promise<number> {
  const [members, fixtureResults, bonusAnswers, allPredictions, allChips, allBonus] = await Promise.all([
    db.leagueMember.findMany({ where: { leagueId }, include: { user: true } }),
    db.fixtureResult.findMany(),
    db.bonusAnswer.findMany(),
    db.prediction.findMany({ where: { leagueId } }),
    db.chipUsage.findMany({ where: { leagueId } }),
    db.bonusPrediction.findMany({ where: { leagueId } }),
  ]);

  const results = fixtureResults.map((r) => ({ matchNumber: r.matchNumber, result: r.result }));
  const bonusAnswersMapped = bonusAnswers.map((a) => ({ questionId: a.questionId, answer: a.answer }));
  const scoreResultsMap = new Map(
    fixtureResults
      .filter((r) => r.goals1 !== null && r.goals2 !== null)
      .map((r) => [r.matchNumber, { goals1: r.goals1!, goals2: r.goals2! }])
  );

  // Pre-compute closest-answer winners for number-type bonus questions
  const closestWinners = computeClosestWinners(
    allBonus.map((b) => ({ userId: b.userId, questionId: b.questionId, answer: b.answer })),
    bonusAnswersMapped,
    BONUS_QUESTIONS,
  );

  // Only count predictions from current members for pool share denominator
  const memberUserIds = new Set(members.map((m) => m.userId));
  const allPredForPool = allPredictions
    .filter((p) => memberUserIds.has(p.userId))
    .map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner, userId: p.userId }));

  const entries = members.map((member) => {
    const userPredictions = allPredictions.filter((p) => p.userId === member.userId);
    const userChips = allChips.filter((c) => c.userId === member.userId);
    const userBonus = allBonus.filter((b) => b.userId === member.userId);

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
      member.userId,
      userBonus.map((b) => ({ questionId: b.questionId, answer: b.answer })),
      bonusAnswersMapped,
      BONUS_QUESTIONS,
      closestWinners,
    );

    const scorePoints = userPredictions.reduce((sum, p) => {
      const result = scoreResultsMap.get(p.matchNumber);
      if (!result || p.goals1 === null || p.goals2 === null) return sum;
      return sum + (p.goals1 === result.goals1 && p.goals2 === result.goals2 ? 15 : 0);
    }, 0);

    // Penalty = days late × latePenaltyPerDay (not per pick)
    const latePreds = userPredictions.filter((p) => p.isLate);
    let penalty = 0;
    if (latePreds.length > 0) {
      let maxDaysLate = 0;
      for (const pred of latePreds) {
        const fixture = ALL_FIXTURES.find((f) => f.matchNumber === pred.matchNumber);
        if (!fixture) continue;
        const deadline = new Date(getPhaseConfig(fixture.phase).deadline);
        const daysLate = Math.ceil((pred.submittedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLate > maxDaysLate) maxDaysLate = daysLate;
      }
      penalty = maxDaysLate * TOURNAMENT.scoring.latePenaltyPerDay;
    }

    const totalPoints =
      groupPoints +
      (knockoutPoints.round32 ?? 0) +
      (knockoutPoints.round16 ?? 0) +
      (knockoutPoints.quarter ?? 0) +
      (knockoutPoints.semi ?? 0) +
      (knockoutPoints.final ?? 0) +
      bonusPoints +
      scorePoints -
      penalty;

    const currentStreak = computeStreak(
      userPredictions.map((p) => ({ matchNumber: p.matchNumber, predictedWinner: p.predictedWinner })),
      results,
    );

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
      scorePoints,
      penalty,
      currentStreak,
    };
  });

  // Sort with tiebreakers: total → knockout total → bonus → fewer late picks
  const sorted = [...entries].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    const aKO = a.round32Points + a.round16Points + a.quarterPoints + a.semiPoints + a.finalPoints;
    const bKO = b.round32Points + b.round16Points + b.quarterPoints + b.semiPoints + b.finalPoints;
    if (bKO !== aKO) return bKO - aKO;
    if (b.bonusPoints !== a.bonusPoints) return b.bonusPoints - a.bonusPoints;
    return a.penalty - b.penalty;
  });

  // Assign ranks — tied players share the same rank
  function tieKey(e: typeof sorted[0]) {
    const ko = e.round32Points + e.round16Points + e.quarterPoints + e.semiPoints + e.finalPoints;
    return `${e.totalPoints}|${ko}|${e.bonusPoints}|${e.penalty}`;
  }
  let currentRank = 1;
  const withRanks = sorted.map((entry, idx) => {
    if (idx > 0 && tieKey(sorted[idx - 1]) !== tieKey(entry)) {
      currentRank = idx + 1;
    }
    return { ...entry, rank: currentRank };
  });

  const prevEntries = await db.leaderboardEntry.findMany({ where: { leagueId } });
  const prevRankMap = new Map(prevEntries.map((e) => [e.userId, e.rank]));

  await db.$transaction(
    withRanks.map((entry) =>
      db.leaderboardEntry.upsert({
        where: { leagueId_userId: { leagueId, userId: entry.userId } },
        update: {
          rank: entry.rank,
          prevRank: prevRankMap.get(entry.userId) ?? null,
          totalPoints: entry.totalPoints,
          groupPoints: entry.groupPoints,
          round32Points: entry.round32Points,
          round16Points: entry.round16Points,
          quarterPoints: entry.quarterPoints,
          semiPoints: entry.semiPoints,
          finalPoints: entry.finalPoints,
          bonusPoints: entry.bonusPoints,
          scorePoints: entry.scorePoints,
          penalty: entry.penalty,
          currentStreak: entry.currentStreak,
          updatedAt: new Date(),
        },
        create: {
          leagueId,
          userId: entry.userId,
          rank: entry.rank,
          prevRank: null,
          totalPoints: entry.totalPoints,
          groupPoints: entry.groupPoints,
          round32Points: entry.round32Points,
          round16Points: entry.round16Points,
          quarterPoints: entry.quarterPoints,
          semiPoints: entry.semiPoints,
          finalPoints: entry.finalPoints,
          bonusPoints: entry.bonusPoints,
          scorePoints: entry.scorePoints,
          penalty: entry.penalty,
          currentStreak: entry.currentStreak,
        },
      })
    )
  );

  // Create rank-change notifications (skip first-time entries and ties with no movement)
  const rankNotifications: { userId: string; leagueId: string; type: string; message: string }[] = [];
  for (const entry of withRanks) {
    const prevRank = prevRankMap.get(entry.userId);
    if (prevRank === undefined || prevRank === entry.rank) continue;

    let type: string;
    let message: string;

    if (entry.rank === 1 && prevRank !== 1) {
      type = 'gained_lead';
      message = `You're now leading the league! 🏆`;
    } else if (prevRank === 1 && entry.rank !== 1) {
      type = 'lost_lead';
      message = `You've been knocked off the top spot 😤 (now #${entry.rank})`;
    } else if (entry.rank < prevRank) {
      type = 'rank_up';
      message = `You moved up to rank #${entry.rank}! 📈`;
    } else {
      type = 'rank_down';
      message = `You dropped to rank #${entry.rank} 📉`;
    }

    rankNotifications.push({ userId: entry.userId, leagueId, type, message });
  }

  if (rankNotifications.length > 0) {
    await db.notification.createMany({ data: rankNotifications });
  }

  return sorted.length;
}
