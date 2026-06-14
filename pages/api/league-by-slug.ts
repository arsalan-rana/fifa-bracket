import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query as { slug: string };
  if (!slug) return res.status(400).json({ error: 'slug required' });

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const league = await db.league.findUnique({
    where: { slug },
    include: { _count: { select: { members: true } } },
  });
  if (!league) return res.status(404).json({ error: 'League not found' });

  const [isMember, members] = await Promise.all([
    db.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
    }),
    db.leagueMember.findMany({
      where: { leagueId: league.id },
      include: { user: { select: { name: true, email: true, image: true } } },
    }),
  ]);

  const canAccess = !!isMember || league.ownerId === user.id || isAdmin(session.user.email);
  if (!canAccess) return res.status(403).json({ error: 'Not a member' });

  return res.status(200).json({
    id: league.id,
    name: league.name,
    slug: league.slug,
    isPrizePool: league.isPrizePool,
    buyInAmount: league.buyInAmount ? Number(league.buyInAmount) : null,
    buyInCurrency: league.buyInCurrency,
    scoreEnabled: league.scoreEnabled,
    allowLateSubmission: league.allowLateSubmission,
    disableLatePenalty: league.disableLatePenalty,
    isVerified: isMember?.isVerified ?? true,
    memberCount: league._count.members,
    members: members.map((m) => ({ name: m.user.name, email: m.user.email, image: m.user.image })),
  });
}
