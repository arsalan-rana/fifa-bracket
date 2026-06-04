import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query as { code: string };
  if (!code?.trim()) return res.status(400).json({ error: 'Code required' });

  const league = await db.league.findUnique({
    where: { inviteCode: code.trim() },
    select: {
      id: true,
      name: true,
      slug: true,
      inviteCode: true,
      _count: { select: { members: true } },
    },
  });

  if (!league) return res.status(404).json({ error: 'League not found' });

  return res.status(200).json({ league });
}
