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

  const [isMember, league] = await Promise.all([
    db.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: user.id } } }),
    db.league.findUnique({ where: { id: leagueId }, select: { allowLateSubmission: true, disableLatePenalty: true } }),
  ]);
  if (!isMember) return res.status(403).json({ error: 'Not a league member' });
  if (!isMember.isVerified) {
    return res.status(403).json({ error: 'Payment not verified. Please e-transfer the buy-in to the league owner.' });
  }

  const phaseIsLate = isPhasePastDeadline(phase);
  const phaseConfig = getPhaseConfig(phase);

  if (phaseIsLate && !league?.allowLateSubmission) {
    return res.status(423).json({ error: 'The deadline has passed — picks are locked.' });
  }

  // Pre-fetch wildcard chips to exempt specific matches from the late penalty
  const wildcardChips = await db.chipUsage.findMany({
    where: { userId: user.id, leagueId, chipType: 'wildcard' },
  });
  const wildcardMatchNumbers = new Set(wildcardChips.map((c) => c.matchNumber).filter((n): n is number => n !== null));

  // Validate each prediction
  const now = new Date();
  for (const pred of predictions) {
    const fixture = getFixture(pred.matchNumber);
    if (!fixture) return res.status(400).json({ error: `Invalid match number: ${pred.matchNumber}` });
    if (fixture.phase !== phase) return res.status(400).json({ error: `Match ${pred.matchNumber} is not in phase ${phase}` });

    // Started matches are always locked — wildcard cannot override this
    if (new Date(fixture.date) <= now) {
      return res.status(400).json({ error: `Match ${pred.matchNumber} has already started — pick is locked` });
    }

    const validWinners = [fixture.team1, fixture.team2];
    if (fixture.canDraw) validWinners.push('DRAW');
    if (!validWinners.includes(pred.predictedWinner)) {
      return res.status(400).json({ error: `Invalid prediction for match ${pred.matchNumber}` });
    }
  }

  try {
    // After deadline, on-time picks are locked — never overwrite them with a late submission
    let predsToSave = [...predictions];
    if (phaseIsLate) {
      const lockedPreds = await db.prediction.findMany({
        where: {
          userId: user.id,
          leagueId,
          matchNumber: { in: predsToSave.map((p) => p.matchNumber) },
          isLate: false,
        },
        select: { matchNumber: true },
      });
      const lockedNums = new Set(lockedPreds.map((p) => p.matchNumber));
      predsToSave = predsToSave.filter((p) => !lockedNums.has(p.matchNumber));

      if (predsToSave.length === 0) {
        return res.status(200).json({ success: true, count: 0, isLate: true, allLocked: true });
      }
    }

    // Upsert each prediction; wildcard chip exempts a match from the late penalty
    await db.$transaction(
      predsToSave.map((pred) => {
        const isLate = phaseIsLate && !wildcardMatchNumbers.has(pred.matchNumber) && !league?.disableLatePenalty;
        return db.prediction.upsert({
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
        });
      })
    );

    await db.activityLog.create({
      data: {
        leagueId,
        userId: user.id,
        eventType: 'predictions_submitted',
        details: JSON.stringify({
          phase,
          phaseName: phaseConfig.name,
          count: predsToSave.length,
          userName: session.user.name,
          isLate: phaseIsLate,
        }),
      },
    });

    return res.status(200).json({ success: true, count: predsToSave.length, isLate: phaseIsLate });
  } catch {
    return res.status(500).json({ error: 'Failed to submit predictions' });
  }
}
