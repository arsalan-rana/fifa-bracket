import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, isPrizePool, buyInAmount, buyInCurrency } = req.body as {
    leagueId: string;
    isPrizePool: boolean;
    buyInAmount?: number | null;
    buyInCurrency?: string;
  };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const actor = await db.user.findUnique({ where: { email: session.user.email } });
  if (!actor) return res.status(404).json({ error: 'User not found' });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const isOwner = league.ownerId === actor.id;
  if (!isOwner && !isAdmin(session.user.email)) {
    return res.status(403).json({ error: 'Only the league owner or admin can update this league' });
  }

  if (isPrizePool && (!buyInAmount || buyInAmount <= 0)) {
    return res.status(400).json({ error: 'Buy-in amount must be greater than 0 for prize pool leagues' });
  }

  const updated = await db.league.update({
    where: { id: leagueId },
    data: {
      isPrizePool,
      buyInAmount: isPrizePool ? buyInAmount : null,
      buyInCurrency: buyInCurrency ?? 'CAD',
    },
  });

  return res.status(200).json({ league: updated });
}
