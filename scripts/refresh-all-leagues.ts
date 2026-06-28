import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import { refreshLeagueLeaderboard } from '../lib/leaderboard';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

async function main() {
  const leagues = await (db as any).league.findMany({ select: { id: true, name: true } });
  for (const league of leagues) {
    const count = await refreshLeagueLeaderboard(league.id);
    console.log(`✓ ${league.name} — ${count} entries`);
  }
}

main().catch(console.error).finally(() => pool.end());
