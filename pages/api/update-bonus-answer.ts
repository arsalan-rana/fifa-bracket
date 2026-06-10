import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import { BONUS_QUESTIONS } from '../../data/fifa-2026';
import { refreshLeagueLeaderboard } from '../../lib/leaderboard';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });
  if (!isAdmin(session.user.email)) return res.status(403).json({ error: 'Admin only' });

  const { questionId, answer } = req.body as { questionId: string; answer: string };
  if (!questionId || !answer?.trim()) {
    return res.status(400).json({ error: 'questionId and answer required' });
  }

  const question = BONUS_QUESTIONS.find((q) => q.id === questionId);
  if (!question) return res.status(400).json({ error: `Unknown question: ${questionId}` });

  try {
    const bonusAnswer = await db.bonusAnswer.upsert({
      where: { questionId },
      update: { answer: answer.trim(), updatedAt: new Date(), updatedBy: session.user.email },
      create: { questionId, answer: answer.trim(), updatedBy: session.user.email },
    });

    // Refresh all leagues — bonus answers are global
    const leagues = await db.league.findMany({ select: { id: true } });
    await Promise.all(leagues.map((l) => refreshLeagueLeaderboard(l.id)));

    return res.status(200).json({ success: true, bonusAnswer, leaguesUpdated: leagues.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update bonus answer' });
  }
}
