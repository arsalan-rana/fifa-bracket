import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, targetUserId } = req.body as { leagueId: string; targetUserId: string };
  if (!leagueId || !targetUserId) {
    return res.status(400).json({ error: 'leagueId and targetUserId are required' });
  }

  const actor = await db.user.findUnique({ where: { email: session.user.email } });
  if (!actor) return res.status(404).json({ error: 'User not found' });

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const isOwner = league.ownerId === actor.id;
  if (!isOwner && !isAdmin(session.user.email)) {
    return res.status(403).json({ error: 'Only the league owner or admin can verify members' });
  }

  const member = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: targetUserId } },
    include: { user: true },
  });
  if (!member) return res.status(404).json({ error: 'Member not found in this league' });

  if (member.isVerified) {
    return res.status(400).json({ error: 'Member is already verified' });
  }

  await db.leagueMember.update({
    where: { leagueId_userId: { leagueId, userId: targetUserId } },
    data: { isVerified: true },
  });

  await db.activityLog.create({
    data: {
      leagueId,
      userId: actor.id,
      eventType: 'member_verified',
      details: JSON.stringify({
        verifiedUserName: member.user.name ?? member.user.email,
        verifiedUserId: targetUserId,
        verifiedByName: session.user.name,
      }),
    },
  });

  return res.status(200).json({ success: true });
}
