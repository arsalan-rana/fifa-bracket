import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

const VALID_EMOJIS = ['👏', '😭', '🔥', '💀', '🤣', '😤'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { tauntId, emoji } = req.body as { tauntId: string; emoji: string };
  if (!tauntId || !emoji) return res.status(400).json({ error: 'Missing fields' });
  if (!VALID_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const taunt = await db.taunt.findUnique({
    where: { id: tauntId },
    select: { leagueId: true },
  });
  if (!taunt) return res.status(404).json({ error: 'Taunt not found' });

  const member = await db.leagueMember.findFirst({
    where: { leagueId: taunt.leagueId, userId: user.id },
  });
  if (!member) return res.status(403).json({ error: 'Not a league member' });

  const existing = await db.tauntReaction.findUnique({
    where: { tauntId_userId: { tauntId, userId: user.id } },
  });

  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off
      await db.tauntReaction.delete({ where: { id: existing.id } });
      return res.status(200).json({ action: 'removed' });
    } else {
      // Switch emoji
      const updated = await db.tauntReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
      return res.status(200).json({ action: 'updated', reaction: updated });
    }
  }

  const reaction = await db.tauntReaction.create({
    data: { tauntId, userId: user.id, emoji },
  });
  return res.status(200).json({ action: 'added', reaction });
}
