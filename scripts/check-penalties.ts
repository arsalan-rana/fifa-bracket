import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

async function main() {
  const league = await db.league.findFirst({ where: { slug: { contains: 'family' } } });
  if (!league) { console.error('family league not found'); process.exit(1); }
  console.log('League:', league.name, '|', league.id);

  const users = await db.user.findMany({
    where: { name: { in: ['Rahat Asif', 'Asif Syed'] } },
  });
  console.log('Users found:', users.map(u => `${u.name} (${u.id})`).join(', '));

  for (const user of users) {
    const allPreds = await db.prediction.findMany({
      where: { userId: user.id, leagueId: league.id },
      orderBy: { matchNumber: 'asc' },
    });
    const latePreds = allPreds.filter(p => p.isLate);
    console.log(`\n--- ${user.name} ---`);
    console.log(`Total picks: ${allPreds.length}, Late picks: ${latePreds.length}`);
    if (latePreds.length > 0) {
      for (const p of latePreds) {
        console.log(`  match:${p.matchNumber} | winner:${p.predictedWinner} | submitted:${p.submittedAt.toISOString()} | isLate:${p.isLate}`);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
