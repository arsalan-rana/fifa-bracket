import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin(session.user.email)) return res.status(403).json({ error: 'Admin only' });

  const { leagueId } = req.query as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const [members, predictions, results] = await Promise.all([
    db.leagueMember.findMany({
      where: { leagueId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    db.prediction.findMany({
      where: { leagueId },
      select: { userId: true, matchNumber: true, predictedWinner: true, isLate: true },
    }),
    db.fixtureResult.findMany({ select: { matchNumber: true, result: true } }),
  ]);

  return res.status(200).json({
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name ?? m.user.email.split('@')[0],
      email: m.user.email,
      image: m.user.image,
      isVerified: m.isVerified,
    })),
    predictions,
    results: results.map((r) => ({ matchNumber: r.matchNumber, result: r.result })),
  });
}
