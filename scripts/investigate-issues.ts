import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { ALL_FIXTURES } from '../data/fifa-2026';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

const fixtureMap = new Map(ALL_FIXTURES.map(f => [f.matchNumber, f]));

async function main() {
  // Find relevant users
  const users = await (db as any).user.findMany({
    where: { OR: [
      { name: { contains: 'rizwan', mode: 'insensitive' } },
      { name: { contains: 'farhan', mode: 'insensitive' } },
      { name: { contains: 'taha', mode: 'insensitive' } },
    ]},
    select: { id: true, name: true, email: true },
  });
  console.log('=== RELEVANT USERS ===');
  users.forEach((u: any) => console.log(`  ${u.name} | ${u.email} | ${u.id}`));

  // All leagues
  const allLeagues = await (db as any).league.findMany({ select: { id: true, name: true, slug: true } });
  console.log('\n=== ALL LEAGUES ===');
  allLeagues.forEach((l: any) => console.log(`  ${l.name} | ${l.slug} | ${l.id}`));

  const rizwan = users.find((u: any) => u.name?.toLowerCase().includes('rizwan'));
  const farhan = users.find((u: any) => u.name?.toLowerCase().includes('farhan'));
  const taha = users.find((u: any) => u.name?.toLowerCase().includes('taha'));

  const bwoysLeague = allLeagues.find((l: any) => l.name?.toLowerCase().includes('bwoy'));
  const fantasyLeague = allLeagues.find((l: any) => l.name?.toLowerCase().includes('fantasy'));

  // ── RIZWAN in Bwoys ──
  if (rizwan && bwoysLeague) {
    console.log(`\n=== RIZWAN (${rizwan.name}) in ${bwoysLeague.name} ===`);
    const chips = await (db as any).chipUsage.findMany({
      where: { userId: rizwan.id, leagueId: bwoysLeague.id },
    });
    console.log('  Chips:', JSON.stringify(chips, null, 2));
    const pred65 = await (db as any).prediction.findUnique({
      where: { userId_leagueId_matchNumber: { userId: rizwan.id, leagueId: bwoysLeague.id, matchNumber: 65 } },
    });
    console.log('  M65 prediction:', JSON.stringify(pred65, null, 2));
  }

  // ── TAHA in Fantasy ──
  if (taha && fantasyLeague) {
    console.log(`\n=== TAHA (${taha.name}) in ${fantasyLeague.name} ===`);
    const results = await (db as any).fixtureResult.findMany();
    const resultMap = new Map(results.map((r: any) => [r.matchNumber, r.result]));
    const preds = await (db as any).prediction.findMany({
      where: { userId: taha.id, leagueId: fantasyLeague.id },
      orderBy: { matchNumber: 'asc' },
    });
    // Walk from most recent played match backwards counting streak
    const playedFixtures = ALL_FIXTURES
      .filter(f => resultMap.has(f.matchNumber))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const predMap = new Map(preds.map((p: any) => [p.matchNumber, p.predictedWinner]));

    let streak = 0;
    console.log('  Recent played fixtures (newest first):');
    for (const f of playedFixtures.slice(0, 15)) {
      const pick = predMap.get(f.matchNumber);
      const result = resultMap.get(f.matchNumber);
      const correct = pick && pick === result;
      console.log(`    M${f.matchNumber} ${f.team1} vs ${f.team2} | result: ${result} | pick: ${pick ?? 'none'} | ${correct ? '✓' : '✗'}`);
      if (!pick || pick !== result) break;
      streak++;
    }
    console.log(`  Calculated streak: ${streak}`);
    const lb = await (db as any).leaderboardEntry.findUnique({
      where: { leagueId_userId: { leagueId: fantasyLeague.id, userId: taha.id } },
    });
    console.log(`  DB streak: ${lb?.currentStreak}`);

    let totalCorrect = 0;
    for (const f of ALL_FIXTURES) {
      const result = resultMap.get(f.matchNumber);
      const pick = predMap.get(f.matchNumber);
      if (result && pick && pick === result) totalCorrect++;
    }
    console.log(`  Total correct picks: ${totalCorrect}`);
  }

  // ── FARHAN across all leagues ──
  if (farhan) {
    console.log(`\n=== FARHAN (${farhan.name}) ===`);
    // All his memberships
    const memberships = await (db as any).leagueMember.findMany({
      where: { userId: farhan.id },
      select: { leagueId: true },
    });
    console.log(`  Member of ${memberships.length} leagues`);
    for (const m of memberships) {
      const league = allLeagues.find((l: any) => l.id === m.leagueId);
      console.log(`\n  League: ${league?.name}`);

      // Chips for M65
      const chips = await (db as any).chipUsage.findMany({
        where: { userId: farhan.id, leagueId: m.leagueId },
      });
      console.log('    Chips:', chips.map((c: any) => `${c.chipType} M${c.matchNumber} phase:${c.phase}`).join(', '));

      // M65 prediction
      const pred65 = await (db as any).prediction.findUnique({
        where: { userId_leagueId_matchNumber: { userId: farhan.id, leagueId: m.leagueId, matchNumber: 65 } },
      });
      if (pred65) console.log(`    M65: pick=${pred65.predictedWinner} isLate=${pred65.isLate} submittedAt=${pred65.submittedAt}`);

      // Any late predictions
      const latePreds = await (db as any).prediction.findMany({
        where: { userId: farhan.id, leagueId: m.leagueId, isLate: true },
      });
      if (latePreds.length > 0) {
        console.log(`    LATE picks: ${latePreds.map((p: any) => `M${p.matchNumber}`).join(', ')}`);
      }
    }
  }
}

main().catch(console.error).finally(() => pool.end());
