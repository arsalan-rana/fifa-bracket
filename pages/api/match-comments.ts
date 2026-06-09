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
    });
    if (!member) return res.status(403).json({ error: 'Not a league member' });

    const comments = await db.matchComment.findMany({
      where: { leagueId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({ comments });
  }

  if (req.method === 'POST') {
    const { leagueId, matchNumber, text } = req.body as { leagueId: string; matchNumber: number; text: string };
    if (!leagueId || !matchNumber || !text?.trim()) return res.status(400).json({ error: 'Missing fields' });
    if (text.trim().length > 280) return res.status(400).json({ error: 'Comment too long (max 280 chars)' });

    const user = await db.user.findUnique({ where: { email: session.user.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const member = await db.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId: user.id } },
    });
    if (!member) return res.status(403).json({ error: 'Not a league member' });

    const comment = await db.matchComment.create({
      data: { leagueId, matchNumber: Number(matchNumber), userId: user.id, text: text.trim() },
      include: { user: { select: { name: true, email: true, image: true } } },
    });

    return res.status(200).json({ comment });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
