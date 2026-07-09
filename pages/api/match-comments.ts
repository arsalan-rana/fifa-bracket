import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
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
    if (!member && !isAdmin(session.user.email)) return res.status(403).json({ error: 'Not a league member' });

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

    // Notify mentioned users (@word matches first name, case-insensitive)
    const mentionedWords = [...new Set(
      [...text.matchAll(/@(\S+)/g)].map((m) => m[1].toLowerCase())
    )];

    if (mentionedWords.length > 0) {
      const allMembers = await db.leagueMember.findMany({
        where: { leagueId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      const senderName = user.name ?? user.email.split('@')[0];
      const preview = text.trim().slice(0, 60) + (text.trim().length > 60 ? '…' : '');
      const notifData: { userId: string; leagueId: string; type: string; message: string; metadata: object }[] = [];

      for (const m of allMembers) {
        if (m.userId === user.id) continue;
        const displayName = m.user.name ?? m.user.email.split('@')[0];
        const firstName = displayName.split(' ')[0].toLowerCase();
        if (mentionedWords.includes(firstName)) {
          notifData.push({
            userId: m.userId,
            leagueId,
            type: 'mention',
            message: `${senderName} mentioned you in Match ${matchNumber}: "${preview}"`,
            metadata: { matchNumber: Number(matchNumber), commentId: comment.id },
          });
        }
      }

      if (notifData.length > 0) {
        await db.notification.createMany({ data: notifData });
      }
    }

    return res.status(200).json({ comment });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
