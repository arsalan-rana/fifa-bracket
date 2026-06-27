import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../lib/auth';
import { db } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const rows = await db.fixtureResult.findMany({
    select: { matchNumber: true, result: true, goals1: true, goals2: true },
  });

  const results: Record<number, { result: string; goals1: number | null; goals2: number | null }> = {};
  for (const r of rows) {
    results[r.matchNumber] = { result: r.result, goals1: r.goals1, goals2: r.goals2 };
  }

  return res.status(200).json({ results });
}
