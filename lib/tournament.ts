import {
  TOURNAMENT,
  TEAMS,
  PHASES,
  ALL_FIXTURES,
  GROUP_FIXTURES,
  getPhaseConfig,
  type Phase,
  type Fixture,
} from '../data/fifa-2026';

export { TOURNAMENT, TEAMS, PHASES, ALL_FIXTURES, GROUP_FIXTURES, getPhaseConfig };
export type { Phase, Fixture };

export function formatPhaseDeadline(phase: Phase): string {
  const config = getPhaseConfig(phase);
  return new Date(config.deadline).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function timeUntilDeadline(phase: Phase): number {
  const config = getPhaseConfig(phase);
  return new Date(config.deadline).getTime() - Date.now();
}

export function calcGroupPoints(
  predictions: { matchNumber: number; predictedWinner: string }[],
  results: { matchNumber: number; result: string }[],
  chips: { matchNumber: number | null; chipType: string; phase: string }[],
  fixedPoints: number
): number {
  let total = 0;

  for (const pred of predictions) {
    const result = results.find((r) => r.matchNumber === pred.matchNumber);
    if (!result) continue;

    if (pred.predictedWinner === result.result) {
      const chip = chips.find(
        (c) =>
          c.matchNumber === pred.matchNumber &&
          c.phase === 'group' &&
          c.chipType === 'doubleUp'
      );
      const multiplier = chip ? 2 : 1;
      total += fixedPoints * multiplier;
    }
  }

  return total;
}

export function calcPoolPoints(
  predictions: { matchNumber: number; predictedWinner: string }[],
  results: { matchNumber: number; result: string }[],
  allPredictions: { matchNumber: number; predictedWinner: string }[],
  chips: { matchNumber: number | null; chipType: string; phase: string }[],
  phase: Phase,
  poolPoints: number
): number {
  let total = 0;

  const phaseFixtures = ALL_FIXTURES.filter((f) => f.phase === phase);

  for (const fixture of phaseFixtures) {
    const result = results.find((r) => r.matchNumber === fixture.matchNumber);
    if (!result) continue;

    const userPred = predictions.find((p) => p.matchNumber === fixture.matchNumber);
    if (!userPred || userPred.predictedWinner !== result.result) continue;

    // Count total correct pickers across all players for this match
    const correctPickers = allPredictions.filter(
      (p) => p.matchNumber === fixture.matchNumber && p.predictedWinner === result.result
    ).length;

    if (correctPickers === 0) continue;
    const share = poolPoints / correctPickers;

    const chip = chips.find(
      (c) =>
        c.matchNumber === fixture.matchNumber &&
        c.phase === phase &&
        (c.chipType === 'doubleUp' || c.chipType === 'banker')
    );

    const multiplier = chip?.chipType === 'banker' ? 3 : chip?.chipType === 'doubleUp' ? 2 : 1;
    total += Math.round(share * multiplier);
  }

  return total;
}

export function calcBonusPoints(
  predictions: { questionId: string; answer: string }[],
  answers: { questionId: string; answer: string }[],
  pointsPerCorrect: number,
  cap: number
): number {
  let total = 0;

  for (const pred of predictions) {
    const answer = answers.find((a) => a.questionId === pred.questionId);
    if (!answer) continue;

    const isCorrect =
      pred.answer.trim().toLowerCase() === answer.answer.trim().toLowerCase();
    if (isCorrect) total += pointsPerCorrect;
  }

  return Math.min(total, cap);
}
