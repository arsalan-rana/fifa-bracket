import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

const TAUNT_TTL_MS = 24 * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.query;
  if (!leagueId || typeof leagueId !== 'string') return res.status(400).json({ error: 'Missing leagueId' });

  const member = await db.leagueMember.findFirst({
    where: { leagueId, user: { email: session.user.email } },
    include: { user: { select: { id: true } } },
  });
  if (!member && !isAdmin(session.user.email)) return res.status(403).json({ error: 'Not a league member' });

  // Admin viewing a league they don't belong to has no membership row — fall back to their own user id
  const requesterId = member?.user.id ?? (await db.user.findUnique({ where: { email: session.user.email } }))?.id ?? null;

  const since = new Date(Date.now() - TAUNT_TTL_MS);

  const taunts = await db.taunt.findMany({
    where: { leagueId, createdAt: { gte: since } },
    include: {
      fromUser: { select: { name: true, email: true } },
      toUser: { select: { email: true } },
      reactions: { select: { userId: true, emoji: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by recipient — newest first, max 5 per user
  const grouped: Record<string, {
    id: string;
    emoji: string;
    label: string;
    fromName: string;
    isSelf: boolean;
    createdAt: string;
    reactions: { emoji: string; count: number; myReaction: boolean }[];
  }[]> = {};

  const REACTION_EMOJIS = ['👏', '😭', '🔥', '💀', '🤣', '😤'];

  for (const t of taunts) {
    const key = t.toUser.email;
    if (!grouped[key]) grouped[key] = [];
    if (grouped[key].length < 5) {
      // Aggregate reactions
      const reactionMap: Record<string, { count: number; myReaction: boolean }> = {};
      for (const emoji of REACTION_EMOJIS) reactionMap[emoji] = { count: 0, myReaction: false };
      for (const r of t.reactions) {
        if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, myReaction: false };
        reactionMap[r.emoji].count++;
        if (r.userId === requesterId) reactionMap[r.emoji].myReaction = true;
      }
      const reactions = REACTION_EMOJIS
        .map((emoji) => ({ emoji, ...reactionMap[emoji] }))
        .filter((r) => r.count > 0 || false);

      grouped[key].push({
        id: t.id,
        emoji: t.emoji,
        label: t.label,
        fromName: t.fromUser.name ?? t.fromUser.email,
        isSelf: t.fromUserId === t.toUserId,
        createdAt: t.createdAt.toISOString(),
        reactions,
      });
    }
  }

  // Also return active taunt count for the current user (for rate limit display)
  const myActiveTaunts = taunts.filter((t) => t.fromUser.email === session.user?.email).length;

  return res.status(200).json({ taunts: grouped, myActiveTaunts });
}
