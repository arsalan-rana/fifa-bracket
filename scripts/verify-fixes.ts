import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';

const pool = new Pool({ connectionString: process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) }) as unknown as PrismaClient;

const FANTASY_ID  = 'cmq2i0f18000004l118nxwqug';
const BWOOYYSS_ID = 'cmq1g0t5n000004l53xdu4pin';
const FAMILY_ID   = 'cmpzzug89000004kz7od4iig7';
const CIREZ_D_ID  = 'cmq9j3ub0004304laxhzahtl2';
const FARHAN_ID   = 'cmq01byho000004l5aux1fhcd';
const RIZWAN_ID   = 'cmq0jzven000004laqaybseke';

async function main() {
  console.log('=== Cirez D (Taha) streak in Fantasy Frauds ===');
  const cirezEntry = await (db as any).leaderboardEntry.findUnique({
    where: { leagueId_userId: { leagueId: FANTASY_ID, userId: CIREZ_D_ID } },
  });
  console.log(`  streak=${cirezEntry?.currentStreak}  (expected 11)`);

  console.log('\n=== Farhan all leagues ===');
  for (const [name, id] of [['Fantasy Frauds', FANTASY_ID], ['Family', FAMILY_ID], ['Bwooyyss', BWOOYYSS_ID]] as [string,string][]) {
    const e = await (db as any).leaderboardEntry.findUnique({ where: { leagueId_userId: { leagueId: id, userId: FARHAN_ID } } });
    const chips = await (db as any).chipUsage.findMany({ where: { userId: FARHAN_ID, leagueId: id } });
    const lates = await (db as any).prediction.findMany({ where: { userId: FARHAN_ID, leagueId: id, isLate: true } });
    console.log(`  ${name}: rank=#${e?.rank} pts=${e?.totalPoints} penalty=${e?.penalty} chips=${chips.map((c:any)=>c.chipType).join('+')} late=${lates.length}`);
  }

  console.log('\n=== Rizwan chips in Bwooyyss ===');
  const rizChips = await (db as any).chipUsage.findMany({ where: { userId: RIZWAN_ID, leagueId: BWOOYYSS_ID } });
  console.log(`  chips: ${rizChips.map((c:any) => `${c.chipType}:M${c.matchNumber}`).join(', ')}`);
  const rizEntry = await (db as any).leaderboardEntry.findUnique({ where: { leagueId_userId: { leagueId: BWOOYYSS_ID, userId: RIZWAN_ID } } });
  console.log(`  rank=#${rizEntry?.rank} pts=${rizEntry?.totalPoints}`);
}

main().catch(console.error).finally(() => pool.end());
