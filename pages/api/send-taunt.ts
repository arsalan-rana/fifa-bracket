import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

const VALID_EMOJIS = ['🔥', '😬', '👀', '🏆', '😴', '🤞'];

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
  if (toEmail === session.user.email) return res.status(400).json({ error: "Can't taunt yourself" });

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

  const taunt = await db.taunt.create({
    data: { leagueId, fromUserId: fromUser.id, toUserId: toUser.id, emoji, label },
  });

  return res.status(200).json({ taunt });
}
