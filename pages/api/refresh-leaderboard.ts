import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { refreshLeagueLeaderboard } from '../../lib/leaderboard';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin(session.user.email)) return res.status(403).json({ error: 'Admin only' });

  const { leagueId } = req.body as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  try {
    const count = await refreshLeagueLeaderboard(leagueId);

    await db.activityLog.create({
      data: {
        leagueId,
        userId: null,
        eventType: 'leaderboard_refreshed',
        details: JSON.stringify({ updatedBy: session.user.email, count }),
      },
    });

    return res.status(200).json({ success: true, entries: count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to refresh leaderboard' });
  }
}
