import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { leagueId } = req.query;
    if (!leagueId || typeof leagueId !== 'string') return res.status(400).json({ error: 'Missing leagueId' });

    const member = await db.leagueMember.findFirst({
      where: { leagueId, user: { email: session.user.email } },
      include: { user: { select: { id: true } } },
    });
    if (!member) return res.status(403).json({ error: 'Not a league member' });

    const notifications = await db.notification.findMany({
      where: { userId: member.user.id, leagueId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.readAt).length;
    return res.status(200).json({ notifications, unreadCount });
  }

  if (req.method === 'POST') {
    // Mark all as read for a league
    const { leagueId } = req.body as { leagueId: string };
    if (!leagueId) return res.status(400).json({ error: 'Missing leagueId' });

    const member = await db.leagueMember.findFirst({
      where: { leagueId, user: { email: session.user.email } },
      include: { user: { select: { id: true } } },
    });
    if (!member) return res.status(403).json({ error: 'Not a league member' });

    await db.notification.updateMany({
      where: { userId: member.user.id, leagueId, readAt: null },
      data: { readAt: new Date() },
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
