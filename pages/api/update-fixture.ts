import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import { refreshLeagueLeaderboard } from '../../lib/leaderboard';
import { getFixture, TEAMS } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin(session.user.email)) return res.status(403).json({ error: 'Admin only' });

  const { matchNumber, result, goals1, goals2 } = req.body as {
    matchNumber: number;
    result: string;
    goals1?: number;
    goals2?: number;
  };

  if (!matchNumber || !result) return res.status(400).json({ error: 'matchNumber and result required' });

  const fixture = getFixture(matchNumber);
  if (!fixture) return res.status(400).json({ error: `Unknown match number: ${matchNumber}` });

  // For group stage: result must be team1, team2, or DRAW
  // For knockout: result must be a known team code (teams are TBD until the round plays out)
  if (fixture.phase === 'group') {
    if (result !== fixture.team1 && result !== fixture.team2 && result !== 'DRAW') {
      return res.status(400).json({ error: `Invalid result "${result}" for match ${matchNumber} — must be ${fixture.team1}, ${fixture.team2}, or DRAW` });
    }
  } else {
    if (!TEAMS[result]) {
      return res.status(400).json({ error: `Unknown team code "${result}" — use a valid 2-3 letter team code` });
    }
    if (result === 'DRAW') {
      return res.status(400).json({ error: 'Knockout matches cannot end in a draw' });
    }
  }

  try {
    const fixtureResult = await db.fixtureResult.upsert({
      where: { matchNumber },
      update: { result, goals1, goals2, updatedAt: new Date(), updatedBy: session.user.email },
      create: { matchNumber, result, goals1, goals2, updatedBy: session.user.email },
    });

    // Refresh all leagues in the background — results are global so all leagues update at once
    const leagues = await db.league.findMany({ select: { id: true } });
    await Promise.all(leagues.map((l) => refreshLeagueLeaderboard(l.id)));

    return res.status(200).json({ success: true, fixtureResult, leaguesUpdated: leagues.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update fixture' });
  }
}
