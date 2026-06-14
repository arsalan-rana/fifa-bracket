import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

async function main() {
  const league = await db.league.findFirst({ where: { slug: { contains: 'family' } } });
  if (!league) { console.error('family league not found'); process.exit(1); }

  // Find all users in the family league with late picks
  const members = await db.leagueMember.findMany({
    where: { leagueId: league.id },
    include: { user: true },
  });

  console.log(`Family league: ${league.name} (${members.length} members)\n`);

  // Search for Asif broadly
  const asifUsers = members.filter(m =>
    m.user.name?.toLowerCase().includes('asif') ||
    m.user.email?.toLowerCase().includes('asif')
  );
  console.log('Users matching "asif":', asifUsers.map(m => `${m.user.name} <${m.user.email}>`));

  // Show all members with any late picks
  console.log('\nMembers with late picks:');
  for (const m of members) {
    const latePreds = await db.prediction.findMany({
      where: { userId: m.userId, leagueId: league.id, isLate: true },
    });
    if (latePreds.length > 0) {
      console.log(`  ${m.user.name ?? m.user.email}: ${latePreds.length} late picks, submitted: ${latePreds[0].submittedAt.toISOString()}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
