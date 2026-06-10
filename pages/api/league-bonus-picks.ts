import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import { isPhasePastDeadline } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId } = req.query as { leagueId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const admin = isAdmin(session.user.email);

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!isMember && !admin) return res.status(403).json({ error: 'Not a league member' });

  // Non-admins can only see after the group deadline — picks are sealed until then
  if (!isPhasePastDeadline('group') && !admin) {
    return res.status(403).json({ error: 'Picks are revealed after the group stage starts' });
  }

  const [members, predictions, officialAnswers] = await Promise.all([
    db.leagueMember.findMany({
      where: { leagueId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    db.bonusPrediction.findMany({
      where: { leagueId },
      select: { userId: true, questionId: true, answer: true },
    }),
    db.bonusAnswer.findMany({ select: { questionId: true, answer: true } }),
  ]);

  return res.status(200).json({
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.name ?? m.user.email.split('@')[0],
      image: m.user.image,
    })),
    predictions,
    officialAnswers: officialAnswers.map((a) => ({ questionId: a.questionId, answer: a.answer })),
  });
}
