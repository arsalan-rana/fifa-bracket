import {
  calcGroupPoints,
  calcPoolPoints,
  calcBonusPoints,
  computeClosestWinners,
} from '../lib/tournament';

import {
  isPhasePastDeadline,
  getCurrentPhase,
  PHASES,
} from '../data/fifa-2026';

// ─── calcGroupPoints ──────────────────────────────────────────────────────────

describe('calcGroupPoints', () => {
  const FIXED = 5;

  it('scores fixed points for a correct prediction', () => {
    const predictions = [{ matchNumber: 1, predictedWinner: 'MEX' }];
    const results = [{ matchNumber: 1, result: 'MEX' }];
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(FIXED);
  });

  it('scores 0 for a wrong prediction', () => {
    const predictions = [{ matchNumber: 1, predictedWinner: 'RSA' }];
    const results = [{ matchNumber: 1, result: 'MEX' }];
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(0);
  });

  it('doubles points when doubleUp chip is applied to that match', () => {
    const predictions = [{ matchNumber: 1, predictedWinner: 'MEX' }];
    const results = [{ matchNumber: 1, result: 'MEX' }];
    const chips = [{ matchNumber: 1, chipType: 'doubleUp', phase: 'group' }];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(FIXED * 2);
  });

  it('does not double on wrong prediction even with doubleUp chip', () => {
    const predictions = [{ matchNumber: 1, predictedWinner: 'RSA' }];
    const results = [{ matchNumber: 1, result: 'MEX' }];
    const chips = [{ matchNumber: 1, chipType: 'doubleUp', phase: 'group' }];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(0);
  });

  it('scores correctly for a DRAW prediction', () => {
    const predictions = [{ matchNumber: 1, predictedWinner: 'DRAW' }];
    const results = [{ matchNumber: 1, result: 'DRAW' }];
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(FIXED);
  });

  it('skips a prediction when no result exists (late but no result yet)', () => {
    const predictions = [{ matchNumber: 99, predictedWinner: 'MEX' }];
    const results: { matchNumber: number; result: string }[] = [];
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    // No result for match 99 → no points, no crash
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(0);
  });

  it('accumulates points across multiple correct predictions', () => {
    const predictions = [
      { matchNumber: 1, predictedWinner: 'MEX' },
      { matchNumber: 2, predictedWinner: 'KOR' },
      { matchNumber: 3, predictedWinner: 'DRAW' },
    ];
    const results = [
      { matchNumber: 1, result: 'MEX' },
      { matchNumber: 2, result: 'KOR' },
      { matchNumber: 3, result: 'DRAW' },
    ];
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(FIXED * 3);
  });

  it('ignores doubleUp chip intended for a different phase', () => {
    const predictions = [{ matchNumber: 1, predictedWinner: 'MEX' }];
    const results = [{ matchNumber: 1, result: 'MEX' }];
    // chip is for 'round32', not 'group' — should not apply
    const chips = [{ matchNumber: 1, chipType: 'doubleUp', phase: 'round32' }];
    expect(calcGroupPoints(predictions, results, chips, FIXED)).toBe(FIXED);
  });
});

// ─── calcPoolPoints ───────────────────────────────────────────────────────────

describe('calcPoolPoints', () => {
  // Match 73 is in round32 (first knockout fixture)
  const POOL = 160;
  const PHASE = 'round32' as const;
  const MATCH_NUM = 73; // first round32 fixture

  function makeUserPreds(winner: string) {
    return [{ matchNumber: MATCH_NUM, predictedWinner: winner }];
  }

  function makeResults(winner: string) {
    return [{ matchNumber: MATCH_NUM, result: winner }];
  }

  it('single correct picker gets full pool share', () => {
    const myPreds = makeUserPreds('ARG');
    const allPreds = [{ matchNumber: MATCH_NUM, predictedWinner: 'ARG' }]; // just me
    const results = makeResults('ARG');
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(POOL);
  });

  it('two correct pickers each get half the pool', () => {
    const myPreds = makeUserPreds('ARG');
    const allPreds = [
      { matchNumber: MATCH_NUM, predictedWinner: 'ARG' },
      { matchNumber: MATCH_NUM, predictedWinner: 'ARG' },
    ];
    const results = makeResults('ARG');
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(POOL / 2);
  });

  it('wrong prediction earns 0', () => {
    const myPreds = makeUserPreds('BRA');
    const allPreds = [
      { matchNumber: MATCH_NUM, predictedWinner: 'ARG' }, // someone else correct
    ];
    const results = makeResults('ARG');
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(0);
  });

  it('banker chip (3x) triples the share', () => {
    const myPreds = makeUserPreds('ARG');
    const allPreds = [{ matchNumber: MATCH_NUM, predictedWinner: 'ARG' }];
    const results = makeResults('ARG');
    const chips = [{ matchNumber: MATCH_NUM, chipType: 'banker', phase: PHASE }];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(POOL * 3);
  });

  it('doubleUp chip (2x) doubles the share', () => {
    const myPreds = makeUserPreds('ARG');
    const allPreds = [{ matchNumber: MATCH_NUM, predictedWinner: 'ARG' }];
    const results = makeResults('ARG');
    const chips = [{ matchNumber: MATCH_NUM, chipType: 'doubleUp', phase: PHASE }];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(POOL * 2);
  });

  it('floors fractional shares — 3 correct pickers each get floor(pool/3)', () => {
    const myPreds = makeUserPreds('ARG');
    const allPreds = [
      { matchNumber: MATCH_NUM, predictedWinner: 'ARG' },
      { matchNumber: MATCH_NUM, predictedWinner: 'ARG' },
      { matchNumber: MATCH_NUM, predictedWinner: 'ARG' },
    ];
    const results = makeResults('ARG');
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    // floor(160/3) = 53, not round(53.33) = 53 either — but with pool=160 both give 53
    // Use pool=80 to expose the difference: floor(80/3)=26, round(80/3)=27
    expect(calcPoolPoints(makeUserPreds('ARG'), results, allPreds, chips, PHASE, 80)).toBe(26);
  });

  it('returns 0 when no correct pickers exist', () => {
    const myPreds = makeUserPreds('FRA');
    const allPreds = [{ matchNumber: MATCH_NUM, predictedWinner: 'FRA' }];
    // But result says ARG won — nobody correct
    const results = makeResults('ARG');
    const chips: { matchNumber: number | null; chipType: string; phase: string }[] = [];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(0);
  });

  it('only applies chip when prediction is correct', () => {
    const myPreds = makeUserPreds('BRA');
    const allPreds = [{ matchNumber: MATCH_NUM, predictedWinner: 'BRA' }];
    const results = makeResults('ARG'); // wrong
    const chips = [{ matchNumber: MATCH_NUM, chipType: 'banker', phase: PHASE }];
    expect(calcPoolPoints(myPreds, results, allPreds, chips, PHASE, POOL)).toBe(0);
  });
});

// ─── calcBonusPoints ──────────────────────────────────────────────────────────

describe('calcBonusPoints', () => {
  const questions = [
    { id: 'golden-boot', points: 40 },
    { id: 'golden-ball', points: 30 },
    { id: 'world-cup-winner', points: 25 },
    { id: 'host-usa-knockouts', points: 10 },
  ];

  const USER_A = 'user-a';

  it('scores a question\'s points for a correct answer', () => {
    const predictions = [{ questionId: 'golden-boot', answer: 'Mbappe' }];
    const answers = [{ questionId: 'golden-boot', answer: 'Mbappe' }];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(40);
  });

  it('scores 0 for a wrong answer', () => {
    const predictions = [{ questionId: 'golden-boot', answer: 'Ronaldo' }];
    const answers = [{ questionId: 'golden-boot', answer: 'Mbappe' }];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(0);
  });

  it('is case-insensitive when matching answers', () => {
    const predictions = [{ questionId: 'golden-boot', answer: 'MBAPPE' }];
    const answers = [{ questionId: 'golden-boot', answer: 'mbappe' }];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(40);
  });

  it('trims whitespace before comparing', () => {
    const predictions = [{ questionId: 'world-cup-winner', answer: '  FRA  ' }];
    const answers = [{ questionId: 'world-cup-winner', answer: 'FRA' }];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(25);
  });

  it('sums per-question points across multiple correct answers', () => {
    const predictions = [
      { questionId: 'golden-boot', answer: 'Mbappe' },
      { questionId: 'golden-ball', answer: 'Messi' },
      { questionId: 'world-cup-winner', answer: 'FRA' },
    ];
    const answers = [
      { questionId: 'golden-boot', answer: 'Mbappe' },
      { questionId: 'golden-ball', answer: 'Messi' },
      { questionId: 'world-cup-winner', answer: 'FRA' },
    ];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(40 + 30 + 25);
  });

  it('skips a question with no matching answer', () => {
    const predictions = [{ questionId: 'golden-boot', answer: 'Mbappe' }];
    const answers: { questionId: string; answer: string }[] = []; // no answer recorded yet
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(0);
  });

  it('scores 0 for a question not in the questions list', () => {
    const predictions = [{ questionId: 'unknown-q', answer: 'something' }];
    const answers = [{ questionId: 'unknown-q', answer: 'something' }];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(0);
  });

  it('partial credit — only correct answers sum up', () => {
    const predictions = [
      { questionId: 'golden-boot', answer: 'Mbappe' },     // correct → 40
      { questionId: 'golden-ball', answer: 'Wrong' },       // wrong → 0
      { questionId: 'host-usa-knockouts', answer: 'Yes' }, // correct → 10
    ];
    const answers = [
      { questionId: 'golden-boot', answer: 'Mbappe' },
      { questionId: 'golden-ball', answer: 'Messi' },
      { questionId: 'host-usa-knockouts', answer: 'Yes' },
    ];
    expect(calcBonusPoints(USER_A, predictions, answers, questions)).toBe(40 + 10);
  });
});

// ─── computeClosestWinners ────────────────────────────────────────────────────

describe('computeClosestWinners', () => {
  const numberQuestions = [{ id: 'total-goals', type: 'number' }];

  it('returns empty map when no answers recorded yet', () => {
    const preds = [{ userId: 'u1', questionId: 'total-goals', answer: '160' }];
    const answers: { questionId: string; answer: string }[] = [];
    expect(computeClosestWinners(preds, answers, numberQuestions).size).toBe(0);
  });

  it('sole predictor wins if there is any prediction', () => {
    const preds = [{ userId: 'u1', questionId: 'total-goals', answer: '160' }];
    const answers = [{ questionId: 'total-goals', answer: '163' }];
    const winners = computeClosestWinners(preds, answers, numberQuestions);
    expect(winners.get('total-goals')?.has('u1')).toBe(true);
  });

  it('closest single predictor wins', () => {
    const preds = [
      { userId: 'u1', questionId: 'total-goals', answer: '160' },
      { userId: 'u2', questionId: 'total-goals', answer: '162' },
      { userId: 'u3', questionId: 'total-goals', answer: '170' },
    ];
    const answers = [{ questionId: 'total-goals', answer: '163' }];
    const winners = computeClosestWinners(preds, answers, numberQuestions);
    const set = winners.get('total-goals')!;
    expect(set.has('u2')).toBe(true);
    expect(set.has('u1')).toBe(false);
    expect(set.has('u3')).toBe(false);
  });

  it('multiple predictors equidistant both win', () => {
    const preds = [
      { userId: 'u1', questionId: 'total-goals', answer: '160' }, // dist 3
      { userId: 'u2', questionId: 'total-goals', answer: '166' }, // dist 3
    ];
    const answers = [{ questionId: 'total-goals', answer: '163' }];
    const winners = computeClosestWinners(preds, answers, numberQuestions);
    const set = winners.get('total-goals')!;
    expect(set.has('u1')).toBe(true);
    expect(set.has('u2')).toBe(true);
  });

  it('ignores non-number type questions', () => {
    const mixed = [
      { id: 'total-goals', type: 'number' },
      { id: 'golden-boot', type: 'text' },
    ];
    const preds = [{ userId: 'u1', questionId: 'golden-boot', answer: 'Mbappe' }];
    const answers = [{ questionId: 'golden-boot', answer: 'Mbappe' }];
    const winners = computeClosestWinners(preds, answers, mixed);
    expect(winners.has('golden-boot')).toBe(false);
  });
});

describe('calcBonusPoints — number type (closest wins)', () => {
  const questions = [{ id: 'total-goals', points: 40, type: 'number' }];
  const answers = [{ questionId: 'total-goals', answer: '163' }];

  it('awards points to the closest predictor', () => {
    const allPreds = [
      { userId: 'u1', questionId: 'total-goals', answer: '162' }, // closest
      { userId: 'u2', questionId: 'total-goals', answer: '150' },
    ];
    const closestWinners = computeClosestWinners(allPreds, answers, questions);
    const u1Preds = [{ questionId: 'total-goals', answer: '162' }];
    const u2Preds = [{ questionId: 'total-goals', answer: '150' }];
    expect(calcBonusPoints('u1', u1Preds, answers, questions, closestWinners)).toBe(40);
    expect(calcBonusPoints('u2', u2Preds, answers, questions, closestWinners)).toBe(0);
  });

  it('awards 0 when no closestWinners map is provided (answer not set yet)', () => {
    const preds = [{ questionId: 'total-goals', answer: '163' }];
    expect(calcBonusPoints('u1', preds, answers, questions)).toBe(0);
  });

  it('does not award via exact-string match for number type', () => {
    // Without closestWinners, exact match should NOT award points for number type
    const allPreds = [{ userId: 'u1', questionId: 'total-goals', answer: '163' }];
    const closestWinners = computeClosestWinners(allPreds, answers, questions);
    const preds = [{ questionId: 'total-goals', answer: '163' }];
    // With closestWinners and correct answer, should get points
    expect(calcBonusPoints('u1', preds, answers, questions, closestWinners)).toBe(40);
  });
});

// ─── Deadline helpers ─────────────────────────────────────────────────────────

describe('isPhasePastDeadline', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when current time is before the group stage deadline', () => {
    // Group deadline is '2026-06-11T18:00:00Z'
    jest.setSystemTime(new Date('2026-06-11T17:59:59Z'));
    expect(isPhasePastDeadline('group')).toBe(false);
  });

  it('returns true when current time is after the group stage deadline', () => {
    jest.setSystemTime(new Date('2026-06-11T18:00:01Z'));
    expect(isPhasePastDeadline('group')).toBe(true);
  });

  it('returns false for the final phase when well before its deadline', () => {
    // Final deadline is '2026-07-17T22:00:00Z'
    jest.setSystemTime(new Date('2026-07-17T21:59:59Z'));
    expect(isPhasePastDeadline('final')).toBe(false);
  });

  it('returns true for the final phase after its deadline', () => {
    jest.setSystemTime(new Date('2026-07-17T22:00:01Z'));
    expect(isPhasePastDeadline('final')).toBe(true);
  });
});

describe('getCurrentPhase', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "group" when before the group stage deadline', () => {
    jest.setSystemTime(new Date('2026-06-10T00:00:00Z'));
    expect(getCurrentPhase()).toBe('group');
  });

  it('returns "round32" when after group deadline but before round32 deadline', () => {
    // group deadline: 2026-06-11T18:00:00Z
    // round32 deadline: 2026-06-27T22:00:00Z
    jest.setSystemTime(new Date('2026-06-12T00:00:00Z'));
    expect(getCurrentPhase()).toBe('round32');
  });

  it('returns "round16" when after round32 deadline but before round16 deadline', () => {
    // round32 deadline: 2026-06-27T22:00:00Z
    // round16 deadline: 2026-07-03T22:00:00Z
    jest.setSystemTime(new Date('2026-06-28T00:00:00Z'));
    expect(getCurrentPhase()).toBe('round16');
  });

  it('returns "quarter" when in the quarter-finals window', () => {
    // round16 deadline: 2026-07-03T22:00:00Z
    // quarter deadline: 2026-07-08T22:00:00Z
    jest.setSystemTime(new Date('2026-07-04T00:00:00Z'));
    expect(getCurrentPhase()).toBe('quarter');
  });

  it('returns "semi" when in the semi-finals window', () => {
    // quarter deadline: 2026-07-08T22:00:00Z
    // semi deadline: 2026-07-13T22:00:00Z
    jest.setSystemTime(new Date('2026-07-09T00:00:00Z'));
    expect(getCurrentPhase()).toBe('semi');
  });

  it('returns "final" when after the semi-finals deadline', () => {
    // semi deadline: 2026-07-13T22:00:00Z
    // final deadline: 2026-07-17T22:00:00Z
    jest.setSystemTime(new Date('2026-07-14T00:00:00Z'));
    expect(getCurrentPhase()).toBe('final');
  });

  it('returns "final" even after the final deadline (tournament over)', () => {
    jest.setSystemTime(new Date('2026-08-01T00:00:00Z'));
    expect(getCurrentPhase()).toBe('final');
  });
});
