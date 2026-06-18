import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

const VALID_EMOJIS = ['🔥', '😬', '👀', '🏆', '😴', '🤞', '🎰', '🖕'];
const CRUDE_TAUNT_EMOJI = '🖕';
const CRUDE_TAUNT_SLUGS = new Set(['fantasy-frauds', 'bwooyyss', 'chawals']);
const TAUNT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_TAUNTS = 3;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, toEmail, emoji, label } = req.body as {
    leagueId: string;
    toEmail: string;
    emoji: string;
    label: string;
  };

  if (!leagueId || !toEmail || !emoji || !label) return res.status(400).json({ error: 'Missing fields' });
  if (!VALID_EMOJIS.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

  const [fromUser, toUser] = await Promise.all([
    db.user.findUnique({ where: { email: session.user.email } }),
    db.user.findUnique({ where: { email: toEmail } }),
  ]);
  if (!fromUser || !toUser) return res.status(404).json({ error: 'User not found' });

  const [fromMember, toMember] = await Promise.all([
    db.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: fromUser.id } } }),
    db.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: toUser.id } } }),
  ]);
  if (!fromMember || !toMember) return res.status(403).json({ error: 'Both users must be league members' });

  // Rate limit: max 2 active (non-expired) taunts per sender per league
  const since = new Date(Date.now() - TAUNT_TTL_MS);
  const activeTaunts = await db.taunt.count({
    where: { leagueId, fromUserId: fromUser.id, createdAt: { gte: since } },
  });
  if (activeTaunts >= MAX_ACTIVE_TAUNTS) {
    return res.status(429).json({ error: 'You already have 3 active taunts in this league. Wait for one to expire before sending another.' });
  }

  const league = await db.league.findUnique({ where: { id: leagueId }, select: { name: true, slug: true } });

  if (emoji === CRUDE_TAUNT_EMOJI && (!league?.slug || !CRUDE_TAUNT_SLUGS.has(league.slug))) {
    return res.status(403).json({ error: 'That taunt is not available in this league.' });
  }

  const taunt = await db.taunt.create({
    data: { leagueId, fromUserId: fromUser.id, toUserId: toUser.id, emoji, label },
  });

  // Create notification for recipient (not for self-taunts)
  if (fromUser.id !== toUser.id) {
    await db.notification.create({
      data: {
        userId: toUser.id,
        leagueId,
        type: 'taunt_received',
        message: `${fromUser.name ?? fromUser.email.split('@')[0]} taunted you ${emoji} in ${league?.name ?? 'your league'}`,
        metadata: { tauntId: taunt.id, label, emoji, fromName: fromUser.name ?? fromUser.email.split('@')[0] },
      },
    });
  }

  return res.status(200).json({ taunt });
}
