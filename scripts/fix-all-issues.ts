import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { refreshLeagueLeaderboard } from '../lib/leaderboard';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

const BWOOYYSS_ID  = 'cmq1g0t5n000004l53xdu4pin';
const FANTASY_ID   = 'cmq2i0f18000004l118nxwqug';
const FAMILY_ID    = 'cmpzzug89000004kz7od4iig7';
const FARHAN_ID    = 'cmq01byho000004l5aux1fhcd';

async function main() {
  // ── 1. FARHAN — Fantasy Frauds ──
  console.log('\n== FARHAN in Fantasy Frauds ==');

  // Clear all late flags
  const ffLate = await (db as any).prediction.updateMany({
    where: { userId: FARHAN_ID, leagueId: FANTASY_ID, isLate: true },
    data: { isLate: false },
  });
  console.log(`  Cleared isLate on ${ffLate.count} picks`);

  // Set M65 → DRAW, isLate=false
  await (db as any).prediction.upsert({
    where: { userId_leagueId_matchNumber: { userId: FARHAN_ID, leagueId: FANTASY_ID, matchNumber: 65 } },
    update: { predictedWinner: 'DRAW', isLate: false, submittedAt: new Date() },
    create: { userId: FARHAN_ID, leagueId: FANTASY_ID, matchNumber: 65, predictedWinner: 'DRAW', isLate: false },
  });
  console.log('  M65 → DRAW (isLate=false)');

  // Apply wildcard chip for M65
  await (db as any).chipUsage.upsert({
    where: { userId_leagueId_chipType_phase: { userId: FARHAN_ID, leagueId: FANTASY_ID, chipType: 'wildcard', phase: 'group' } },
    update: { matchNumber: 65, usedAt: new Date() },
    create: { userId: FARHAN_ID, leagueId: FANTASY_ID, chipType: 'wildcard', phase: 'group', matchNumber: 65 },
  });
  console.log('  Wildcard chip → M65');

  // Apply doubleUp chip for M65
  await (db as any).chipUsage.upsert({
    where: { userId_leagueId_chipType_phase: { userId: FARHAN_ID, leagueId: FANTASY_ID, chipType: 'doubleUp', phase: 'group' } },
    update: { matchNumber: 65, usedAt: new Date() },
    create: { userId: FARHAN_ID, leagueId: FANTASY_ID, chipType: 'doubleUp', phase: 'group', matchNumber: 65 },
  });
  console.log('  DoubleUp chip → M65');

  // ── 2. FARHAN — Family ──
  console.log('\n== FARHAN in Family ==');

  const famLate = await (db as any).prediction.updateMany({
    where: { userId: FARHAN_ID, leagueId: FAMILY_ID, isLate: true },
    data: { isLate: false },
  });
  console.log(`  Cleared isLate on ${famLate.count} picks`);

  await (db as any).prediction.upsert({
    where: { userId_leagueId_matchNumber: { userId: FARHAN_ID, leagueId: FAMILY_ID, matchNumber: 65 } },
    update: { predictedWinner: 'DRAW', isLate: false, submittedAt: new Date() },
    create: { userId: FARHAN_ID, leagueId: FAMILY_ID, matchNumber: 65, predictedWinner: 'DRAW', isLate: false },
  });
  console.log('  M65 → DRAW (isLate=false)');

  await (db as any).chipUsage.upsert({
    where: { userId_leagueId_chipType_phase: { userId: FARHAN_ID, leagueId: FAMILY_ID, chipType: 'wildcard', phase: 'group' } },
    update: { matchNumber: 65, usedAt: new Date() },
    create: { userId: FARHAN_ID, leagueId: FAMILY_ID, chipType: 'wildcard', phase: 'group', matchNumber: 65 },
  });
  console.log('  Wildcard chip → M65');

  await (db as any).chipUsage.upsert({
    where: { userId_leagueId_chipType_phase: { userId: FARHAN_ID, leagueId: FAMILY_ID, chipType: 'doubleUp', phase: 'group' } },
    update: { matchNumber: 65, usedAt: new Date() },
    create: { userId: FARHAN_ID, leagueId: FAMILY_ID, chipType: 'doubleUp', phase: 'group', matchNumber: 65 },
  });
  console.log('  DoubleUp chip → M65');

  // ── 3. FARHAN — Bwooyyss (verify, should already be correct) ──
  console.log('\n== FARHAN in Bwooyyss (verify) ==');
  const bwFarhanChips = await (db as any).chipUsage.findMany({
    where: { userId: FARHAN_ID, leagueId: BWOOYYSS_ID },
  });
  const bwFarhanM65 = await (db as any).prediction.findUnique({
    where: { userId_leagueId_matchNumber: { userId: FARHAN_ID, leagueId: BWOOYYSS_ID, matchNumber: 65 } },
  });
  console.log(`  Chips: ${bwFarhanChips.map((c: any) => c.chipType).join(', ')}`);
  console.log(`  M65: ${bwFarhanM65?.predictedWinner} isLate=${bwFarhanM65?.isLate} ✓`);

  // ── 4. Refresh all affected leaderboards ──
  console.log('\n== Refreshing leaderboards ==');
  for (const [name, id] of [['Fantasy Frauds', FANTASY_ID], ['Family', FAMILY_ID], ['Bwooyyss', BWOOYYSS_ID]] as [string, string][]) {
    const count = await refreshLeagueLeaderboard(id);
    console.log(`  ✓ ${name} — ${count} entries`);
  }

  // ── 5. Verify final state ──
  console.log('\n== Final verification ==');
  for (const [name, id] of [['Fantasy Frauds', FANTASY_ID], ['Family', FAMILY_ID], ['Bwooyyss', BWOOYYSS_ID]] as [string, string][]) {
    const entry = await (db as any).leaderboardEntry.findUnique({
      where: { leagueId_userId: { leagueId: id, userId: FARHAN_ID } },
    });
    const chips = await (db as any).chipUsage.findMany({ where: { userId: FARHAN_ID, leagueId: id } });
    const m65 = await (db as any).prediction.findUnique({
      where: { userId_leagueId_matchNumber: { userId: FARHAN_ID, leagueId: id, matchNumber: 65 } },
    });
    const latePreds = await (db as any).prediction.findMany({
      where: { userId: FARHAN_ID, leagueId: id, isLate: true },
    });
    console.log(`\n  ${name}:`);
    console.log(`    Rank #${entry?.rank} | ${entry?.totalPoints} pts | penalty=${entry?.penalty}`);
    console.log(`    Chips: ${chips.map((c: any) => `${c.chipType}:M${c.matchNumber}`).join(', ')}`);
    console.log(`    M65: pick=${m65?.predictedWinner} isLate=${m65?.isLate}`);
    console.log(`    Late picks remaining: ${latePreds.length}`);
  }
}

main().catch(console.error).finally(() => pool.end());
