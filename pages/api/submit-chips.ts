import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';
import { getFixture, getPhaseConfig, isPhaseOpen } from '../../data/fifa-2026';
import type { Phase } from '../../data/fifa-2026';

interface ChipPayload {
  leagueId: string;
  phase: Phase;
  chipType: 'doubleUp' | 'wildcard' | 'banker' | 'upsetSpecial';
  matchNumber: number;
}

const CHIPS_PER_PHASE: Record<string, string[]> = {
  group:   ['doubleUp', 'wildcard'],
  round32: ['doubleUp', 'wildcard'],
  round16: ['wildcard'],
  quarter: ['wildcard', 'banker'],
  semi:    ['wildcard', 'banker'],
  final:   ['wildcard', 'banker'],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, phase, chipType, matchNumber } = req.body as ChipPayload;
  if (!leagueId || !phase || !chipType || !matchNumber) {
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

  const fixture = getFixture(matchNumber);
  if (!fixture) return res.status(400).json({ error: 'Invalid match number' });

  const fixturePhase = fixture.phase;

  // After the phase deadline only wildcard is allowed (its purpose is to protect late picks)
  if (!isPhaseOpen(fixturePhase) && chipType !== 'wildcard') {
    return res.status(400).json({ error: 'Phase deadline passed — only wildcard can be applied now' });
  }

  const allowed = CHIPS_PER_PHASE[fixturePhase] ?? [];
  if (!allowed.includes(chipType)) {
    return res.status(400).json({ error: `Chip ${chipType} not available in ${fixturePhase}` });
  }

  // Banker chip is once per tournament (all phases combined)
  if (chipType === 'banker') {
    const bankerUsed = await db.chipUsage.findFirst({
      where: { userId: user.id, leagueId, chipType: 'banker' },
    });
    if (bankerUsed) return res.status(400).json({ error: 'Banker chip already used this tournament' });
  }

  if (new Date(fixture.date) <= new Date()) {
    return res.status(400).json({ error: 'This match has already started — chip cannot be applied' });
  }

  try {
    const chip = await db.chipUsage.upsert({
      where: {
        userId_leagueId_chipType_phase: {
          userId: user.id,
          leagueId,
          chipType,
          phase: fixturePhase,
        },
      },
      update: { matchNumber, usedAt: new Date() },
      create: { userId: user.id, leagueId, chipType, phase: fixturePhase, matchNumber },
    });

    return res.status(200).json({ success: true, chip });
  } catch {
    return res.status(500).json({ error: 'Failed to submit chip' });
  }
}
