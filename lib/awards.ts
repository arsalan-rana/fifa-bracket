import { db } from './db';
import { ALL_FIXTURES, getPhaseConfig, type Fixture, type Phase } from '../data/fifa-2026';
import { getTeamProfile } from '../data/team-profiles';

// Score-prediction accuracy needs a minimum sample or a lucky 1-for-1 guess would "win".
const MIN_SCORE_PREDICTIONS_FOR_ACCURACY = 5;

export interface AwardWinner {
  userId: string;
  name: string;
  image: string | null;
  value: string;
}

export interface AwardResult {
  key: string;
  name: string;
  icon: string;
  description: string;
  group: 'style' | 'phase' | 'league';
  winners: AwardWinner[];
  emptyNote?: string;
}

export interface PersonalStats {
  accuracyPct: number | null;
  correctUpsets: number;
  rank: number | null;
}

interface MemberInfo {
  userId: string;
  name: string;
  image: string | null;
}

type PredictionRow = {
  userId: string;
  matchNumber: number;
  predictedWinner: string;
  submittedAt: Date;
  isLate: boolean;
  goals1: number | null;
  goals2: number | null;
};

type ResultRow = { matchNumber: number; result: string; goals1: number | null; goals2: number | null };

const KNOCKOUT_PHASE_ORDER: { phase: Phase; key: string; name: string; icon: string }[] = [
  { phase: 'group', key: 'groupPoints', name: 'Group Stage Gaffer', icon: '🧢' },
  { phase: 'round32', key: 'round32Points', name: 'Last-32 Lion', icon: '🦁' },
  { phase: 'round16', key: 'round16Points', name: 'Sweet Sixteen Sniper', icon: '🎯' },
  { phase: 'quarter', key: 'quarterPoints', name: 'Quarter-Final Kingpin', icon: '👑' },
  { phase: 'semi', key: 'semiPoints', name: 'Semi-Final Sovereign', icon: '💎' },
  { phase: 'final', key: 'finalPoints', name: 'The Final Word', icon: '🏆' },
];

function makeWinners(
  members: Map<string, MemberInfo>,
  userIds: string[],
  valueFor: (userId: string) => string
): AwardWinner[] {
  return userIds
    .map((userId) => {
      const m = members.get(userId);
      if (!m) return null;
      return { userId, name: m.name, image: m.image, value: valueFor(userId) };
    })
    .filter((w): w is AwardWinner => w !== null);
}

/** Finds every userId tied at the max (or min) of a Map<userId, number>, ignoring entries below/above a threshold. */
function topTied(scores: Map<string, number>, mode: 'max' | 'min', minEntries = 1): string[] {
  if (scores.size < minEntries) return [];
  const values = [...scores.values()];
  const target = mode === 'max' ? Math.max(...values) : Math.min(...values);
  return [...scores.entries()].filter(([, v]) => v === target).map(([userId]) => userId);
}

/** Win-or-draw-by-the-lower-ranked-team upset definition (same as used for the "most upsets" bonus question). */
function getUpsetMagnitude(fixture: Fixture, result: string): number {
  const r1 = getTeamProfile(fixture.team1)?.fifaRanking;
  const r2 = getTeamProfile(fixture.team2)?.fifaRanking;
  if (r1 == null || r2 == null || r1 === r2) return 0;
  if (result === 'DRAW') return Math.abs(r1 - r2);
  const winnerRank = result === fixture.team1 ? r1 : r2;
  const loserRank = result === fixture.team1 ? r2 : r1;
  return winnerRank > loserRank ? winnerRank - loserRank : 0;
}

export interface LeagueAwards {
  categories: AwardResult[];
  personalStats: Record<string, PersonalStats>;
}

export async function computeLeagueAwards(leagueId: string): Promise<LeagueAwards> {
  const [members, predictions, fixtureResults, taunts, leaderboardEntries] = await Promise.all([
    db.leagueMember.findMany({ where: { leagueId }, include: { user: { select: { name: true, email: true, image: true } } } }),
    db.prediction.findMany({ where: { leagueId } }),
    db.fixtureResult.findMany(),
    db.taunt.findMany({ where: { leagueId } }),
    db.leaderboardEntry.findMany({ where: { leagueId } }),
  ]);

  const memberMap = new Map<string, MemberInfo>(
    members.map((m) => [m.userId, { userId: m.userId, name: m.user.name ?? m.user.email.split('@')[0], image: m.user.image }])
  );
  const memberIds = new Set(memberMap.keys());

  const fixtureByMatch = new Map<number, Fixture>(ALL_FIXTURES.map((f) => [f.matchNumber, f]));
  const resultMap = new Map<number, ResultRow>(fixtureResults.map((r) => [r.matchNumber, r]));

  const predictionsByUser = new Map<string, PredictionRow[]>();
  for (const p of predictions as PredictionRow[]) {
    if (!memberIds.has(p.userId)) continue;
    if (!predictionsByUser.has(p.userId)) predictionsByUser.set(p.userId, []);
    predictionsByUser.get(p.userId)!.push(p);
  }

  const results: AwardResult[] = [];
  const personalStats = new Map<string, PersonalStats>();
  for (const userId of memberIds) {
    personalStats.set(userId, { accuracyPct: null, correctUpsets: 0, rank: null });
  }
  for (const e of leaderboardEntries) {
    const stats = personalStats.get(e.userId);
    if (stats) stats.rank = e.rank;
  }

  // ── Chalk Merchant — highest % of picks matching the pool majority ──────────
  {
    const majorityByMatch = new Map<number, string | null>();
    for (const [matchNumber] of fixtureByMatch) {
      const picksForMatch = predictions.filter((p) => p.matchNumber === matchNumber && memberIds.has(p.userId));
      if (picksForMatch.length === 0) continue;
      const counts = new Map<string, number>();
      for (const p of picksForMatch) counts.set(p.predictedWinner, (counts.get(p.predictedWinner) ?? 0) + 1);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const isTiedForFirst = sorted.length > 1 && sorted[0][1] === sorted[1][1];
      majorityByMatch.set(matchNumber, isTiedForFirst ? null : sorted[0][0]);
    }

    const pct = new Map<string, number>();
    const detail = new Map<string, string>();
    for (const [userId, preds] of predictionsByUser) {
      let matches = 0;
      let total = 0;
      for (const p of preds) {
        const majority = majorityByMatch.get(p.matchNumber);
        if (majority === undefined || majority === null) continue;
        total++;
        if (p.predictedWinner === majority) matches++;
      }
      if (total === 0) continue;
      pct.set(userId, Math.round((matches / total) * 100));
      detail.set(userId, `${Math.round((matches / total) * 100)}% chalk picks (${matches}/${total})`);
    }
    const winnerIds = topTied(pct, 'max');
    results.push({
      key: 'chalk-merchant',
      name: 'Chalk Merchant',
      icon: '📋',
      description: 'Highest % of picks matching the league’s most popular choice',
      group: 'style',
      winners: makeWinners(memberMap, winnerIds, (id) => detail.get(id) ?? ''),
      emptyNote: winnerIds.length === 0 ? 'No picks decided yet' : undefined,
    });
  }

  // ── Giant Killer — most correct upset picks ──────────────────────────────────
  {
    const counts = new Map<string, number>();
    for (const [userId, preds] of predictionsByUser) {
      let n = 0;
      for (const p of preds) {
        const result = resultMap.get(p.matchNumber);
        const fixture = fixtureByMatch.get(p.matchNumber);
        if (!result || !fixture || p.predictedWinner !== result.result) continue;
        if (getUpsetMagnitude(fixture, result.result) > 0) n++;
      }
      counts.set(userId, n);
      const stats = personalStats.get(userId);
      if (stats) stats.correctUpsets = n;
    }
    const winnerIds = topTied(counts, 'max');
    const anyPositive = winnerIds.some((id) => (counts.get(id) ?? 0) > 0);
    results.push({
      key: 'giant-killer',
      name: 'Giant Killer',
      icon: '⚔️',
      description: 'Most correct upset picks (a lower-ranked team winning or drawing)',
      group: 'style',
      winners: anyPositive ? makeWinners(memberMap, winnerIds, (id) => `${counts.get(id)} correct upsets`) : [],
      emptyNote: !anyPositive ? 'No upsets correctly called yet' : undefined,
    });
  }

  // ── Fence Sitter — most draws picked in Group Stage ──────────────────────────
  {
    const counts = new Map<string, number>();
    for (const [userId, preds] of predictionsByUser) {
      let n = 0;
      for (const p of preds) {
        const fixture = fixtureByMatch.get(p.matchNumber);
        if (fixture?.phase === 'group' && p.predictedWinner === 'DRAW') n++;
      }
      counts.set(userId, n);
    }
    const winnerIds = topTied(counts, 'max');
    const anyPositive = winnerIds.some((id) => (counts.get(id) ?? 0) > 0);
    results.push({
      key: 'fence-sitter',
      name: 'Fence Sitter',
      icon: '🪑',
      description: 'Most draws picked in the Group Stage',
      group: 'style',
      winners: anyPositive ? makeWinners(memberMap, winnerIds, (id) => `${counts.get(id)} draws picked`) : [],
      emptyNote: !anyPositive ? 'No one picked a group-stage draw' : undefined,
    });
  }

  // ── Nostradamus — highest overall pick accuracy ──────────────────────────────
  {
    const pct = new Map<string, number>();
    const detail = new Map<string, string>();
    for (const [userId, preds] of predictionsByUser) {
      let correct = 0;
      let decided = 0;
      for (const p of preds) {
        const result = resultMap.get(p.matchNumber);
        if (!result) continue;
        decided++;
        if (p.predictedWinner === result.result) correct++;
      }
      if (decided === 0) continue;
      const roundedPct = Math.round((correct / decided) * 100);
      pct.set(userId, roundedPct);
      detail.set(userId, `${roundedPct}% accuracy (${correct}/${decided})`);
      const stats = personalStats.get(userId);
      if (stats) stats.accuracyPct = roundedPct;
    }
    const winnerIds = topTied(pct, 'max');
    results.push({
      key: 'nostradamus',
      name: 'Nostradamus',
      icon: '🔮',
      description: 'Highest overall pick accuracy across every decided match',
      group: 'style',
      winners: makeWinners(memberMap, winnerIds, (id) => detail.get(id) ?? ''),
      emptyNote: winnerIds.length === 0 ? 'No matches decided yet' : undefined,
    });
  }

  // ── Fortune Teller — highest exact-score accuracy (min sample) ───────────────
  {
    const pct = new Map<string, number>();
    const detail = new Map<string, string>();
    for (const [userId, preds] of predictionsByUser) {
      let correct = 0;
      let submitted = 0;
      for (const p of preds) {
        if (p.goals1 === null || p.goals2 === null) continue;
        const result = resultMap.get(p.matchNumber);
        if (!result || result.goals1 === null || result.goals2 === null) continue;
        submitted++;
        if (p.goals1 === result.goals1 && p.goals2 === result.goals2) correct++;
      }
      if (submitted < MIN_SCORE_PREDICTIONS_FOR_ACCURACY) continue;
      pct.set(userId, Math.round((correct / submitted) * 100));
      detail.set(userId, `${Math.round((correct / submitted) * 100)}% exact scores (${correct}/${submitted})`);
    }
    const winnerIds = topTied(pct, 'max');
    results.push({
      key: 'fortune-teller',
      name: 'Fortune Teller',
      icon: '⭐',
      description: `Highest exact-score prediction accuracy (min. ${MIN_SCORE_PREDICTIONS_FOR_ACCURACY} submitted)`,
      group: 'style',
      winners: makeWinners(memberMap, winnerIds, (id) => detail.get(id) ?? ''),
      emptyNote: winnerIds.length === 0 ? `Nobody has ${MIN_SCORE_PREDICTIONS_FOR_ACCURACY}+ score predictions yet` : undefined,
    });
  }

  // ── Ghost FC / The Analyst — fewest / most score predictions submitted ───────
  {
    const counts = new Map<string, number>();
    for (const userId of memberIds) {
      const preds = predictionsByUser.get(userId) ?? [];
      counts.set(userId, preds.filter((p) => p.goals1 !== null && p.goals2 !== null).length);
    }
    const fewestIds = topTied(counts, 'min');
    const mostIds = topTied(counts, 'max');
    results.push({
      key: 'ghost-fc',
      name: 'Ghost FC',
      icon: '👻',
      description: 'Fewest exact-score predictions submitted all tournament',
      group: 'style',
      winners: makeWinners(memberMap, fewestIds, (id) => `${counts.get(id)} score predictions`),
    });
    results.push({
      key: 'the-analyst',
      name: 'The Analyst',
      icon: '📊',
      description: 'Most exact-score predictions submitted all tournament',
      group: 'style',
      winners: makeWinners(memberMap, mostIds, (id) => `${counts.get(id)} score predictions`),
      emptyNote: (counts.get(mostIds[0]) ?? 0) === 0 ? 'Nobody has submitted a score prediction yet' : undefined,
    });
  }

  // ── Last Minute Larry — most late submissions ────────────────────────────────
  {
    const counts = new Map<string, number>();
    for (const userId of memberIds) {
      const preds = predictionsByUser.get(userId) ?? [];
      counts.set(userId, preds.filter((p) => p.isLate).length);
    }
    const winnerIds = topTied(counts, 'max');
    const anyPositive = winnerIds.some((id) => (counts.get(id) ?? 0) > 0);
    results.push({
      key: 'last-minute-larry',
      name: 'Last Minute Larry',
      icon: '⏰',
      description: 'Most picks submitted after the deadline',
      group: 'style',
      winners: anyPositive ? makeWinners(memberMap, winnerIds, (id) => `${counts.get(id)} late picks`) : [],
      emptyNote: !anyPositive ? 'Nobody has submitted a late pick' : undefined,
    });
  }

  // ── Iron Streak — longest correct-pick streak achieved at any point ─────────
  {
    const longest = new Map<string, number>();
    for (const [userId, preds] of predictionsByUser) {
      const chronological = preds
        .map((p) => ({ p, fixture: fixtureByMatch.get(p.matchNumber), result: resultMap.get(p.matchNumber) }))
        .filter((x) => x.fixture && x.result)
        .sort((a, b) => new Date(a.fixture!.date).getTime() - new Date(b.fixture!.date).getTime());

      let current = 0;
      let best = 0;
      for (const x of chronological) {
        if (x.p.predictedWinner === x.result!.result) {
          current++;
          best = Math.max(best, current);
        } else {
          current = 0;
        }
      }
      longest.set(userId, best);
    }
    const winnerIds = topTied(longest, 'max');
    const anyPositive = winnerIds.some((id) => (longest.get(id) ?? 0) > 0);
    results.push({
      key: 'iron-streak',
      name: 'Iron Streak',
      icon: '🔥',
      description: 'Longest correct-pick streak reached at any point this tournament',
      group: 'style',
      winners: anyPositive ? makeWinners(memberMap, winnerIds, (id) => `${longest.get(id)}-match streak`) : [],
      emptyNote: !anyPositive ? 'No streaks yet' : undefined,
    });
  }

  // ── Trash Talker / Human Punching Bag — taunts sent / received ──────────────
  {
    const sent = new Map<string, number>();
    const received = new Map<string, number>();
    for (const userId of memberIds) { sent.set(userId, 0); received.set(userId, 0); }
    for (const t of taunts) {
      if (t.fromUserId === t.toUserId) continue; // exclude self-hype
      if (memberIds.has(t.fromUserId)) sent.set(t.fromUserId, (sent.get(t.fromUserId) ?? 0) + 1);
      if (memberIds.has(t.toUserId)) received.set(t.toUserId, (received.get(t.toUserId) ?? 0) + 1);
    }
    const sentWinnerIds = topTied(sent, 'max');
    const receivedWinnerIds = topTied(received, 'max');
    results.push({
      key: 'trash-talker',
      name: 'Trash Talker',
      icon: '🗣️',
      description: 'Most taunts sent to other league members',
      group: 'style',
      winners: (sent.get(sentWinnerIds[0]) ?? 0) > 0 ? makeWinners(memberMap, sentWinnerIds, (id) => `${sent.get(id)} taunts sent`) : [],
      emptyNote: (sent.get(sentWinnerIds[0]) ?? 0) === 0 ? 'Nobody has sent a taunt yet' : undefined,
    });
    results.push({
      key: 'human-punching-bag',
      name: 'Human Punching Bag',
      icon: '🥊',
      description: 'Most taunts received from other league members',
      group: 'style',
      winners: (received.get(receivedWinnerIds[0]) ?? 0) > 0 ? makeWinners(memberMap, receivedWinnerIds, (id) => `${received.get(id)} taunts received`) : [],
      emptyNote: (received.get(receivedWinnerIds[0]) ?? 0) === 0 ? 'Nobody has received a taunt yet' : undefined,
    });
  }

  // ── Phase champions — direct pull from LeaderboardEntry per-phase fields ────
  for (const { phase, key, name, icon } of KNOCKOUT_PHASE_ORDER) {
    const scores = new Map<string, number>();
    for (const e of leaderboardEntries) {
      scores.set(e.userId, (e as unknown as Record<string, number>)[key] ?? 0);
    }
    const winnerIds = topTied(scores, 'max');
    const maxValue = scores.get(winnerIds[0]) ?? 0;
    results.push({
      key: `phase-${phase}`,
      name,
      icon,
      description: `Most points earned in the ${getPhaseConfig(phase).name}`,
      group: 'phase',
      winners: maxValue > 0 ? makeWinners(memberMap, winnerIds, (id) => `${scores.get(id)} pts`) : [],
      emptyNote: maxValue <= 0 ? `${getPhaseConfig(phase).name} not decided yet` : undefined,
    });
  }

  // ── The Statement Game — who correctly called the tournament's biggest upset ─
  {
    let biggestFixture: Fixture | null = null;
    let biggestResult: ResultRow | null = null;
    let biggestMagnitude = 0;
    for (const [matchNumber, fixture] of fixtureByMatch) {
      const result = resultMap.get(matchNumber);
      if (!result) continue;
      const magnitude = getUpsetMagnitude(fixture, result.result);
      if (magnitude > biggestMagnitude) {
        biggestMagnitude = magnitude;
        biggestFixture = fixture;
        biggestResult = result;
      }
    }

    if (biggestFixture && biggestResult && biggestMagnitude > 0) {
      const winnerName = biggestResult.result === 'DRAW' ? 'Draw' : biggestResult.result;
      const scoreStr = biggestResult.goals1 !== null && biggestResult.goals2 !== null
        ? ` (${biggestResult.goals1}-${biggestResult.goals2})`
        : '';
      const winnerIds = [...memberIds].filter((userId) =>
        (predictionsByUser.get(userId) ?? []).some(
          (p) => p.matchNumber === biggestFixture!.matchNumber && p.predictedWinner === biggestResult!.result
        )
      );
      results.push({
        key: 'the-statement-game',
        name: 'The Statement Game',
        icon: '📣',
        description: `Called the tournament's biggest upset: M${biggestFixture.matchNumber} ${biggestFixture.team1} vs ${biggestFixture.team2} → ${winnerName}${scoreStr}`,
        group: 'league',
        winners: makeWinners(memberMap, winnerIds, () => 'Called it right'),
        emptyNote: winnerIds.length === 0 ? 'Nobody in this league called it' : undefined,
      });
    } else {
      results.push({
        key: 'the-statement-game',
        name: 'The Statement Game',
        icon: '📣',
        description: 'Called the tournament’s biggest upset',
        group: 'league',
        winners: [],
        emptyNote: 'No upsets recorded yet',
      });
    }
  }

  // ── Photo Finish — smallest points gap between 1st and 2nd overall ──────────
  {
    const ranked = [...leaderboardEntries].sort((a, b) => b.totalPoints - a.totalPoints);
    if (ranked.length >= 2) {
      const [first, second] = ranked;
      const gap = first.totalPoints - second.totalPoints;
      results.push({
        key: 'photo-finish',
        name: 'Photo Finish',
        icon: '🏁',
        description: gap === 0
          ? 'Tied for 1st place overall!'
          : `Only ${gap} point${gap === 1 ? '' : 's'} separate 1st and 2nd place overall`,
        group: 'league',
        winners: makeWinners(memberMap, [first.userId, second.userId], (id) =>
          id === first.userId ? `1st, ${first.totalPoints} pts` : `2nd, ${second.totalPoints} pts`
        ),
      });
    } else {
      results.push({
        key: 'photo-finish',
        name: 'Photo Finish',
        icon: '🏁',
        description: 'Smallest points gap between 1st and 2nd place overall',
        group: 'league',
        winners: [],
        emptyNote: 'Not enough scored members yet',
      });
    }
  }

  return { categories: results, personalStats: Object.fromEntries(personalStats) };
}
