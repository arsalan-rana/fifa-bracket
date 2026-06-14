import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { BONUS_QUESTIONS, isPhasePastDeadline } from '../../data/fifa-2026';

interface BonusPayload {
  leagueId: string;
  answers: { questionId: string; answer: string }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, answers } = req.body as BonusPayload;
  if (!leagueId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const [isMember, league] = await Promise.all([
    db.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: user.id } } }),
    db.league.findUnique({ where: { id: leagueId }, select: { allowLateSubmission: true } }),
  ]);
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });
  if (!isMember.isVerified) {
    return res.status(403).json({ error: 'Payment not verified. Please e-transfer the buy-in to the league owner.' });
  }

  if (isPhasePastDeadline('group') && !league?.allowLateSubmission) {
    return res.status(400).json({ error: 'Bonus predictions are locked — the group stage has already started' });
  }

  const validIds = new Set(BONUS_QUESTIONS.map((q) => q.id));

  for (const ans of answers) {
    if (!validIds.has(ans.questionId)) {
      return res.status(400).json({ error: `Invalid question: ${ans.questionId}` });
    }
    if (!ans.answer?.trim()) {
      return res.status(400).json({ error: `Answer required for ${ans.questionId}` });
    }
  }

  try {
    await db.$transaction(
      answers.map((ans) =>
        db.bonusPrediction.upsert({
          where: {
            userId_leagueId_questionId: {
              userId: user.id,
              leagueId,
              questionId: ans.questionId,
            },
          },
          update: { answer: ans.answer.trim(), submittedAt: new Date() },
          create: {
            userId: user.id,
            leagueId,
            questionId: ans.questionId,
            answer: ans.answer.trim(),
          },
        })
      )
    );

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to submit bonus answers' });
  }
}
