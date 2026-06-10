import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { getFixture, isPhasePastDeadline } from '../../data/fifa-2026';
import type { Phase } from '../../data/fifa-2026';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { fromLeagueId, toLeagueId } = req.body as { fromLeagueId: string; toLeagueId: string };
  if (!fromLeagueId || !toLeagueId) return res.status(400).json({ error: 'Missing required fields' });
  if (fromLeagueId === toLeagueId) return res.status(400).json({ error: 'Cannot copy to same league' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const fromMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: fromLeagueId, userId: user.id } },
  });
  if (!fromMember) return res.status(403).json({ error: 'Not a member of source league' });

  const toMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: toLeagueId, userId: user.id } },
  });
  if (!toMember) return res.status(403).json({ error: 'Not a member of target league' });
  if (!toMember.isVerified) return res.status(403).json({ error: 'Payment not verified in target league' });

  const sourcePredictions = await db.prediction.findMany({
    where: { userId: user.id, leagueId: fromLeagueId },
  });

  const now = new Date();
  const copiable = sourcePredictions.filter((p) => {
    const fixture = getFixture(p.matchNumber);
    return fixture && new Date(fixture.date) > now;
  });

  if (copiable.length === 0) {
    return res.status(200).json({ success: true, count: 0 });
  }

  const bonusIsLocked = isPhasePastDeadline('group');
  const bonusPredictions = bonusIsLocked
    ? []
    : await db.bonusPrediction.findMany({ where: { userId: user.id, leagueId: fromLeagueId } });

  await db.$transaction([
    ...copiable.map((p) => {
      const fixture = getFixture(p.matchNumber)!;
      const isLate = isPhasePastDeadline(fixture.phase as Phase);
      return db.prediction.upsert({
        where: {
          userId_leagueId_matchNumber: { userId: user.id, leagueId: toLeagueId, matchNumber: p.matchNumber },
        },
        update: { predictedWinner: p.predictedWinner, submittedAt: new Date(), isLate },
        create: {
          userId: user.id,
          leagueId: toLeagueId,
          matchNumber: p.matchNumber,
          predictedWinner: p.predictedWinner,
          isLate,
        },
      });
    }),
    ...bonusPredictions.map((b) =>
      db.bonusPrediction.upsert({
        where: {
          userId_leagueId_questionId: { userId: user.id, leagueId: toLeagueId, questionId: b.questionId },
        },
        update: { answer: b.answer, submittedAt: new Date() },
        create: {
          userId: user.id,
          leagueId: toLeagueId,
          questionId: b.questionId,
          answer: b.answer,
        },
      })
    ),
  ]);

  return res.status(200).json({ success: true, count: copiable.length, bonusCount: bonusPredictions.length });
}
