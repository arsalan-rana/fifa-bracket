import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, targetUserId } = req.body as { leagueId: string; targetUserId: string };
  if (!leagueId || !targetUserId) return res.status(400).json({ error: 'leagueId and targetUserId required' });

  // Look up the requesting user
  const requestingUser = await db.user.findUnique({ where: { email: session.user.email } });
  if (!requestingUser) return res.status(404).json({ error: 'User not found' });

  // Look up the league
  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const admin = isAdmin(session.user.email);
  const isOwner = league.ownerId === requestingUser.id;

  // Only league owner or admin can kick
  if (!isOwner && !admin) {
    return res.status(403).json({ error: 'Only the league owner or admin can kick members' });
  }

  // Cannot kick yourself
  if (targetUserId === requestingUser.id) {
    return res.status(400).json({ error: 'You cannot kick yourself' });
  }

  // Cannot kick the league owner
  if (targetUserId === league.ownerId) {
    return res.status(400).json({ error: 'Cannot kick the league owner' });
  }

  // Verify the target is actually a member
  const membership = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: targetUserId } },
  });
  if (!membership) return res.status(404).json({ error: 'Member not found in this league' });

  try {
    // Delete all related records for this user in this league
    await db.prediction.deleteMany({ where: { leagueId, userId: targetUserId } });
    await db.bonusPrediction.deleteMany({ where: { leagueId, userId: targetUserId } });
    await db.chipUsage.deleteMany({ where: { leagueId, userId: targetUserId } });
    await db.leaderboardEntry.deleteMany({ where: { leagueId, userId: targetUserId } });

    // Remove the member
    await db.leagueMember.delete({
      where: { leagueId_userId: { leagueId, userId: targetUserId } },
    });

    // Log the kick
    await db.activityLog.create({
      data: {
        leagueId,
        userId: requestingUser.id,
        eventType: 'member_kicked',
        details: JSON.stringify({ kickedUserId: targetUserId, kickedBy: session.user.email }),
      },
    });

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to kick member' });
  }
}
