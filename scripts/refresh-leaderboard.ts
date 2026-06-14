import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { refreshLeagueLeaderboard } from '../lib/leaderboard';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

async function main() {
  const slugArg = process.argv[2];
  if (!slugArg) { console.error('Usage: npx tsx scripts/refresh-leaderboard.ts <slug>'); process.exit(1); }

  const league = await db.league.findFirst({ where: { slug: { contains: slugArg } } });
  if (!league) { console.error(`League not found: ${slugArg}`); process.exit(1); }

  console.log(`Refreshing leaderboard for: ${league.name} (${league.id})`);
  const count = await refreshLeagueLeaderboard(league.id);
  console.log(`Done — ${count} entries updated.`);

  const entries = await db.leaderboardEntry.findMany({
    where: { leagueId: league.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { totalPoints: 'desc' },
  });
  console.log('\nLeaderboard:');
  for (const e of entries) {
    const name = e.user.name ?? e.user.email.split('@')[0];
    console.log(`  ${name}: ${e.totalPoints} pts (group:${e.groupPoints} bonus:${e.bonusPoints} penalty:${e.penalty})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
