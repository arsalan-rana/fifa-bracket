import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

// Users to clear late flags for (partial name match, case-insensitive)
const TARGET_NAMES = ['rahat', 'asif syed'];
const LEAGUE_SLUG = 'family';

async function main() {
  const league = await db.league.findUnique({ where: { slug: LEAGUE_SLUG } });
  if (!league) throw new Error(`League "${LEAGUE_SLUG}" not found`);

  const members = await db.leagueMember.findMany({
    where: { leagueId: league.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const targets = members.filter((m) => {
    const display = (m.user.name ?? m.user.email).toLowerCase();
    return TARGET_NAMES.some((t) => display.includes(t));
  });

  if (targets.length === 0) {
    console.log('No matching members found. Check the names.');
    return;
  }

  for (const t of targets) {
    const display = t.user.name ?? t.user.email;
    const latePreds = await db.prediction.findMany({
      where: { leagueId: league.id, userId: t.userId, isLate: true },
    });
    console.log(`${display}: ${latePreds.length} late prediction(s)`);

    if (latePreds.length > 0) {
      const result = await db.prediction.updateMany({
        where: { leagueId: league.id, userId: t.userId, isLate: true },
        data: { isLate: false },
      });
      console.log(`  → Cleared ${result.count} late flag(s)`);
    }
  }

  console.log('\nDone. Now run: npx tsx scripts/refresh-leaderboard.ts family');
}

main().catch(console.error).finally(() => pool.end());
