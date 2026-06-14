import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

async function main() {
  const testLeague = await db.league.findFirst({ where: { slug: 'test-league' } });
  if (!testLeague) { console.error('test-league not found'); process.exit(1); }

  const chips = await db.chipUsage.findMany({
    where: { leagueId: testLeague.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { usedAt: 'desc' },
  });

  console.log(`Test league chips (${chips.length} total):\n`);
  for (const c of chips) {
    console.log(`  ${c.user.name ?? c.user.email} | ${c.chipType} | phase:${c.phase} | match:${c.matchNumber} | ${c.usedAt.toISOString()}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => pool.end());
