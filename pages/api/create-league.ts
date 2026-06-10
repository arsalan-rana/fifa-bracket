import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  if (!isAdmin(session.user.email)) {
    return res.status(403).json({ error: 'Only the admin can create leagues' });
  }

  const { name, description, isPrizePool, buyInAmount, buyInCurrency, joinAsPlayer } = req.body as {
    name: string;
    description?: string;
    isPrizePool?: boolean;
    buyInAmount?: number;
    buyInCurrency?: string;
    joinAsPlayer?: boolean;
  };
  if (!name?.trim()) return res.status(400).json({ error: 'League name required' });
  if (isPrizePool && (typeof buyInAmount !== 'number' || buyInAmount <= 0)) {
    return res.status(400).json({ error: 'A positive buy-in amount is required for prize pool leagues' });
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  let slug = slugify(name);
  const existing = await db.league.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  try {
    const league = await db.league.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim(),
        ownerId: user.id,
        isPrizePool: isPrizePool ?? false,
        buyInAmount: isPrizePool && buyInAmount ? buyInAmount : undefined,
        buyInCurrency: buyInCurrency ?? 'CAD',
        ...(joinAsPlayer !== false && {
          members: { create: { userId: user.id, isVerified: true } },
        }),
      },
    });

    await db.activityLog.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        eventType: 'league_created',
        details: JSON.stringify({ leagueName: league.name }),
      },
    });

    return res.status(201).json({ league });
  } catch {
    return res.status(500).json({ error: 'Failed to create league' });
  }
}
