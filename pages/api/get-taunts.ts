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

  // Group taunts by recipient, newest first, max 5 per user
  const grouped: Record<string, { emoji: string; label: string; fromName: string; isSelf: boolean }[]> = {};
  for (const t of taunts) {
    const key = t.toUser.email;
    if (!grouped[key]) grouped[key] = [];
    if (grouped[key].length < 5) {
      grouped[key].push({
        emoji: t.emoji,
        label: t.label,
        fromName: t.fromUser.name ?? t.fromUser.email,
        isSelf: t.fromUserId === t.toUserId,
      });
    }
  }

  return res.status(200).json({ taunts: grouped });
}
