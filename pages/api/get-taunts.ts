import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') return res.status(400).json({ error: 'Missing leagueId' });

  const member = await db.leagueMember.findFirst({
    where: { leagueId, user: { email: session.user.email } },
  });
  if (!member) return res.status(403).json({ error: 'Not a league member' });

  const taunts = await db.taunt.findMany({
    where: { leagueId },
    include: {
      fromUser: { select: { name: true, email: true } },
      toUser: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Keep only the most recent taunt per recipient, keyed by toUser email
  const latest: Record<string, { emoji: string; label: string; fromName: string }> = {};
  for (const t of taunts) {
    if (!latest[t.toUser.email]) {
      latest[t.toUser.email] = {
        emoji: t.emoji,
        label: t.label,
        fromName: t.fromUser.name ?? t.fromUser.email,
      };
    }
  }

  return res.status(200).json({ taunts: latest });
}
