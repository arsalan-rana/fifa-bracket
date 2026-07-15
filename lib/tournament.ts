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
    total += Math.floor(share * multiplier);
  }

  return total;
}

/**
 * Pre-compute which userIds win "closest answer" (type: 'number') questions.
 * Returns a map of questionId → Set<userId> for questions where the user(s)
 * with the numerically closest answer to the official answer win.
 */
export function computeClosestWinners(
  allPredictions: { userId: string; questionId: string; answer: string }[],
  answers: { questionId: string; answer: string }[],
  questions: { id: string; type?: string }[],
): Map<string, Set<string>> {
  const winners = new Map<string, Set<string>>();

  for (const question of questions) {
    if (question.type !== 'number') continue;

    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer) continue;

    const correctValue = parseFloat(answer.answer);
    if (isNaN(correctValue)) continue;

    const preds = allPredictions.filter((p) => p.questionId === question.id);
    if (preds.length === 0) continue;

    let minDist = Infinity;
    for (const pred of preds) {
      const val = parseFloat(pred.answer);
      if (!isNaN(val)) {
        const dist = Math.abs(val - correctValue);
        if (dist < minDist) minDist = dist;
      }
    }

    const winnerSet = new Set<string>();
    for (const pred of preds) {
      const val = parseFloat(pred.answer);
      if (!isNaN(val) && Math.abs(val - correctValue) === minDist) {
        winnerSet.add(pred.userId);
      }
    }

    winners.set(question.id, winnerSet);
  }

  return winners;
}

/** A tie with no published tiebreak is recorded as multiple comma-separated correct answers. */
export function parseBonusAnswers(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function isBonusAnswerCorrect(userAnswer: string, officialRaw: string): boolean {
  const options = parseBonusAnswers(officialRaw).map((o) => o.toLowerCase());
  return options.includes(userAnswer.trim().toLowerCase());
}

export function calcBonusPoints(
  userId: string,
  predictions: { questionId: string; answer: string }[],
  answers: { questionId: string; answer: string }[],
  questions: { id: string; points: number; type?: string }[],
  closestWinners?: Map<string, Set<string>>,
): number {
  let total = 0;

  for (const pred of predictions) {
    const question = questions.find((q) => q.id === pred.questionId);
    if (!question) continue;

    if (question.type === 'number') {
      if (closestWinners?.get(pred.questionId)?.has(userId)) {
        total += question.points;
      }
    } else {
      const answer = answers.find((a) => a.questionId === pred.questionId);
      if (!answer) continue;
      if (isBonusAnswerCorrect(pred.answer, answer.answer)) total += question.points;
    }
  }

  return total;
}
