import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { ALL_FIXTURES } from '../data/fifa-2026';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

const BWOOYYSS_ID = 'cmq1g0t5n000004l53xdu4pin';
const FANTASY_ID  = 'cmq2i0f18000004l118nxwqug';
const RIZWAN_ID   = 'cmq0jzven000004laqaybseke';
const TAHA_ID     = 'cmq9qs8ma000004l705lnm10d';

async function main() {
  // ── RIZWAN in Bwooyyss ──
  console.log('=== RIZWAN chips in Bwooyyss ===');
  const rizwanChips = await (db as any).chipUsage.findMany({
    where: { userId: RIZWAN_ID, leagueId: BWOOYYSS_ID },
  });
  console.log(rizwanChips.length ? JSON.stringify(rizwanChips, null, 2) : '  (none)');

  console.log('\n=== RIZWAN all predictions in Bwooyyss (M60-M72) ===');
  const rizwanPreds = await (db as any).prediction.findMany({
    where: { userId: RIZWAN_ID, leagueId: BWOOYYSS_ID, matchNumber: { gte: 59 } },
    orderBy: { matchNumber: 'asc' },
  });
  rizwanPreds.forEach((p: any) => console.log(`  M${p.matchNumber}: ${p.predictedWinner} isLate=${p.isLate}`));

  // ── TAHA — find which Fantasy Frauds user has the high streak ──
  console.log('\n=== All Fantasy Frauds members ===');
  const members = await (db as any).leagueMember.findMany({
    where: { leagueId: FANTASY_ID },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  members.forEach((m: any) => console.log(`  ${m.user.name} | ${m.user.email} | ${m.user.id}`));

  console.log('\n=== Leaderboard for Fantasy Frauds (with streak) ===');
  const lb = await (db as any).leaderboardEntry.findMany({
    where: { leagueId: FANTASY_ID },
    include: { user: { select: { name: true } } },
    orderBy: { rank: 'asc' },
  });
  lb.forEach((e: any) => console.log(`  #${e.rank} ${e.user.name} — streak=${e.currentStreak} total=${e.totalPoints}`));

  // ── Check Taha's actual predictions ──
  console.log('\n=== TAHA (cirezd17) Fantasy Frauds predictions ===');
  const tahaPreds = await (db as any).prediction.findMany({
    where: { userId: TAHA_ID, leagueId: FANTASY_ID },
    orderBy: { matchNumber: 'asc' },
  });
  console.log(`  Total predictions: ${tahaPreds.length}`);

  const results = await (db as any).fixtureResult.findMany();
  const resultMap = new Map(results.map((r: any) => [r.matchNumber, r.result]));
  const predMap = new Map(tahaPreds.map((p: any) => [p.matchNumber, p.predictedWinner]));

  let correct = 0;
  for (const f of ALL_FIXTURES) {
    const res = resultMap.get(f.matchNumber);
    const pick = predMap.get(f.matchNumber);
    if (res && pick && pick === res) correct++;
  }
  console.log(`  Correct picks: ${correct}`);

  // Walk streak
  const playedDesc = ALL_FIXTURES
    .filter(f => resultMap.has(f.matchNumber))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  console.log('\n  Streak walk (newest first):');
  for (const f of playedDesc.slice(0, 15)) {
    const pick = predMap.get(f.matchNumber);
    const res = resultMap.get(f.matchNumber);
    const ok = pick && pick === res;
    console.log(`    M${f.matchNumber} ${f.team1}vs${f.team2} pick=${pick ?? '-'} res=${res} ${ok ? '✓' : '✗'}`);
    if (!ok) break;
    streak++;
  }
  console.log(`  Calculated streak: ${streak}`);

  // Find who has streak in leaderboard
  const highStreaks = lb.filter((e: any) => e.currentStreak >= 3);
  console.log('\n=== Players with streak >= 3 in Fantasy Frauds ===');
  highStreaks.forEach((e: any) => console.log(`  ${e.user.name} streak=${e.currentStreak}`));
}

main().catch(console.error).finally(() => pool.end());
