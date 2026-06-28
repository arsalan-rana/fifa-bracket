import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { ALL_FIXTURES } from '../data/fifa-2026';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

const FANTASY_ID  = 'cmq2i0f18000004l118nxwqug';
const CIREZ_D_ID  = 'cmq9j3ub0004304laxhzahtl2'; // streak=10 in DB

async function main() {
  const results = await (db as any).fixtureResult.findMany();
  const resultMap = new Map(results.map((r: any) => [r.matchNumber, r.result]));

  const preds = await (db as any).prediction.findMany({
    where: { userId: CIREZ_D_ID, leagueId: FANTASY_ID },
    orderBy: { matchNumber: 'asc' },
  });
  const predMap = new Map(preds.map((p: any) => [p.matchNumber, p.predictedWinner]));

  // Walk newest-first with SORT order shown
  const playedFixtures = ALL_FIXTURES
    .filter(f => resultMap.has(f.matchNumber))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  console.log('=== Cirez D streak walk (newest → oldest) ===');
  let streak = 0;
  for (const f of playedFixtures) {
    const pick = predMap.get(f.matchNumber);
    const res = resultMap.get(f.matchNumber);
    const ok = pick && pick === res;
    console.log(`  M${String(f.matchNumber).padStart(2)} ${new Date(f.date).toISOString().slice(0,16)} ${f.team1}vs${f.team2} | pick=${pick ?? '---'} res=${res} ${ok ? '✓ streak=' + (streak+1) : '✗ BREAK'}`);
    if (!ok) break;
    streak++;
  }
  console.log(`\n  Final streak: ${streak}  (DB says 10)`);

  // Count total correct
  let totalCorrect = 0;
  for (const f of ALL_FIXTURES) {
    const res = resultMap.get(f.matchNumber);
    const pick = predMap.get(f.matchNumber);
    if (res && pick && pick === res) totalCorrect++;
  }
  console.log(`  Total correct picks: ${totalCorrect}`);

  // Show the most recent 15 matches with results
  console.log('\n=== Most recent 15 played fixtures ===');
  for (const f of playedFixtures.slice(0, 15)) {
    const pick = predMap.get(f.matchNumber);
    const res = resultMap.get(f.matchNumber);
    console.log(`  M${f.matchNumber} ${new Date(f.date).toISOString().slice(0,16)} | res=${res} pick=${pick ?? '---'} ${pick === res ? '✓' : '✗'}`);
  }
}

main().catch(console.error).finally(() => pool.end());
