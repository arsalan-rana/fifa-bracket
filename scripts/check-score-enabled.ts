import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;
async function main() {
  const leagues = await db.league.findMany({ select: { name: true, slug: true, scoreEnabled: true }, orderBy: { name: 'asc' } });
  for (const l of leagues) console.log(`  ${l.name}: scoreEnabled=${l.scoreEnabled}`);
}
main().catch(console.error).finally(() => pool.end());
