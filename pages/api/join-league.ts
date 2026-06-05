import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { inviteCode } = req.body as { inviteCode: string };
  if (!inviteCode?.trim()) return res.status(400).json({ error: 'Invite code required' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const league = await db.league.findUnique({ where: { inviteCode: inviteCode.trim() } });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const alreadyMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
  });
  if (alreadyMember) return res.status(400).json({ error: 'Already a member' });

  try {
    // New joiners to prize-pool leagues start unverified (payment pending)
    const isVerified = !league.isPrizePool;
    await db.leagueMember.create({ data: { leagueId: league.id, userId: user.id, isVerified } });

    await db.activityLog.create({
      data: {
        leagueId: league.id,
        userId: user.id,
        eventType: 'member_joined',
        details: JSON.stringify({ userName: session.user.name }),
      },
    });

    return res.status(200).json({ league });
  } catch {
    return res.status(500).json({ error: 'Failed to join league' });
  }
}
