import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { getFixture, getPhaseConfig, isPhasePastDeadline } from '../../data/fifa-2026';
import type { Phase } from '../../data/fifa-2026';

interface PredictionPayload {
  leagueId: string;
  phase: Phase;
  predictions: { matchNumber: number; predictedWinner: string }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, phase, predictions } = req.body as PredictionPayload;
  if (!leagueId || !phase || !Array.isArray(predictions)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });
  if (!isMember.isVerified) {
    return res.status(403).json({ error: 'Payment not verified. Please e-transfer the buy-in to the league owner.' });
  }

  const isLate = isPhasePastDeadline(phase);
  const phaseConfig = getPhaseConfig(phase);

  // Validate each prediction
  for (const pred of predictions) {
    const fixture = getFixture(pred.matchNumber);
    if (!fixture) return res.status(400).json({ error: `Invalid match number: ${pred.matchNumber}` });
    if (fixture.phase !== phase) return res.status(400).json({ error: `Match ${pred.matchNumber} is not in phase ${phase}` });

    const validWinners = [fixture.team1, fixture.team2];
    if (fixture.canDraw) validWinners.push('DRAW');
    if (!validWinners.includes(pred.predictedWinner)) {
      return res.status(400).json({ error: `Invalid prediction for match ${pred.matchNumber}` });
    }
  }

  try {
    // Upsert each prediction
    await db.$transaction(
      predictions.map((pred) =>
        db.prediction.upsert({
          where: {
            userId_leagueId_matchNumber: {
              userId: user.id,
              leagueId,
              matchNumber: pred.matchNumber,
            },
          },
          update: {
            predictedWinner: pred.predictedWinner,
            submittedAt: new Date(),
            isLate,
          },
          create: {
            userId: user.id,
            leagueId,
            matchNumber: pred.matchNumber,
            predictedWinner: pred.predictedWinner,
            isLate,
          },
        })
      )
    );

    await db.activityLog.create({
      data: {
        leagueId,
        userId: user.id,
        eventType: 'predictions_submitted',
        details: JSON.stringify({
          phase,
          phaseName: phaseConfig.name,
          count: predictions.length,
          userName: session.user.name,
          isLate,
        }),
      },
    });

    return res.status(200).json({ success: true, count: predictions.length, isLate });
  } catch {
    return res.status(500).json({ error: 'Failed to submit predictions' });
  }
}
