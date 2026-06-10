import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions, isAdmin } from '../../lib/auth';
import { db } from '../../lib/db';
import AdminPanel from './AdminPanel';
import type { StoredResult, StoredBonusAnswer } from './AdminPanel';

export const metadata = { title: 'Admin — Enter Results | WC26' };

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!isAdmin(session?.user?.email)) {
    notFound();
  }

  const [rawResults, rawBonusAnswers] = await Promise.all([
    db.fixtureResult.findMany({ orderBy: { matchNumber: 'asc' } }),
    db.bonusAnswer.findMany(),
  ]);

  const existingResults: StoredResult[] = rawResults.map((r) => ({
    matchNumber: r.matchNumber,
    result: r.result,
    goals1: r.goals1,
    goals2: r.goals2,
    updatedAt: r.updatedAt.toISOString(),
    updatedBy: r.updatedBy,
  }));

  const existingBonusAnswers: StoredBonusAnswer[] = rawBonusAnswers.map((a) => ({
    questionId: a.questionId,
    answer: a.answer,
    updatedAt: a.updatedAt.toISOString(),
    updatedBy: a.updatedBy,
  }));

  return <AdminPanel existingResults={existingResults} existingBonusAnswers={existingBonusAnswers} />;
}
