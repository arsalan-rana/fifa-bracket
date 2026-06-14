import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { ALL_FIXTURES } from '../data/fifa-2026';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

async function main() {
  const league = await db.league.findFirst({ where: { slug: { contains: 'family' } } });
  if (!league) { console.error('not found'); process.exit(1); }

  const user = await db.user.findFirst({ where: { name: { contains: 'Rahat' } } });
  if (!user) { console.error('user not found'); process.exit(1); }

  console.log(`User: ${user.name} | League: ${league.name}\n`);

  // All fixture results
  const results = await db.fixtureResult.findMany({ orderBy: { matchNumber: 'asc' } });
  console.log(`Fixture results in DB: ${results.length}`);
  for (const r of results) {
    const fix = ALL_FIXTURES.find(f => f.matchNumber === r.matchNumber);
    console.log(`  Match ${r.matchNumber}: ${fix?.team1 ?? '?'} vs ${fix?.team2 ?? '?'} → ${r.result}${r.goals1 !== null ? ` (${r.goals1}-${r.goals2})` : ''}`);
  }

  // Rahat's predictions for those matches
  const preds = await db.prediction.findMany({
    where: { userId: user.id, leagueId: league.id, matchNumber: { in: results.map(r => r.matchNumber) } },
    orderBy: { matchNumber: 'asc' },
  });
  console.log(`\nRahat's predictions for played matches (${preds.length}):`);
  for (const p of preds) {
    const result = results.find(r => r.matchNumber === p.matchNumber);
    const correct = result?.result === p.predictedWinner;
    console.log(`  Match ${p.matchNumber}: picked ${p.predictedWinner} | result ${result?.result} | ${correct ? '✓ CORRECT' : '✗'} | late:${p.isLate}`);
  }

  // QAT vs SUI specifically
  const qatSui = ALL_FIXTURES.find(f =>
    (f.team1 === 'QAT' && f.team2 === 'SUI') || (f.team1 === 'SUI' && f.team2 === 'QAT')
  );
  console.log(`\nQAT vs SUI: Match ${qatSui?.matchNumber}`);
  const qatSuiResult = results.find(r => r.matchNumber === qatSui?.matchNumber);
  console.log(`Result: ${qatSuiResult?.result ?? 'not yet entered'}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
