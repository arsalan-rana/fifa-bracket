import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

const MAX_STATUS_LENGTH = 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const { leagueId, message } = req.body as { leagueId: string; message: string | null };
  if (!leagueId) return res.status(400).json({ error: 'Missing leagueId' });

  const trimmed = message?.trim() ?? null;
  if (trimmed && trimmed.length > MAX_STATUS_LENGTH) {
    return res.status(400).json({ error: `Status must be ${MAX_STATUS_LENGTH} characters or less` });
  }

  const member = await db.leagueMember.findFirst({
    where: { leagueId, user: { email: session.user.email } },
  });
  if (!member) return res.status(403).json({ error: 'Not a league member' });

  const updated = await db.leagueMember.update({
    where: { id: member.id },
    data: {
      statusMessage: trimmed || null,
      statusUpdatedAt: trimmed ? new Date() : null,
    },
  });

  return res.status(200).json({ statusMessage: updated.statusMessage, statusUpdatedAt: updated.statusUpdatedAt });
}
