import { db } from '../lib/db';

async function main() {
  // Find Rusak
  const rusak = await db.user.findFirst({ where: { name: { contains: 'Rusak', mode: 'insensitive' } } });
  if (!rusak) {
    const users = await db.user.findMany({ select: { id: true, name: true, email: true } });
    console.log('Rusak not found. All users:');
    users.forEach(u => console.log(' ', u.name, u.email));
    return;
  }
  console.log('Found:', rusak.name, rusak.email);

  // Rusak chips
  const chips = await db.chipUsage.findMany({
    where: { userId: rusak.id },
    include: { league: { select: { name: true } } },
  });
  console.log('\nRusak chips:', chips.length);
  chips.forEach((c: any) => console.log(` [${c.league.name}] match ${c.matchNumber} phase:${c.phase} type:${c.chipType}`));

  // All chips for match 63
  console.log('\nAll chips for match 63 (POR vs UZB):');
  const chips63 = await db.chipUsage.findMany({
    where: { matchNumber: 63 },
    include: { user: { select: { name: true } }, league: { select: { name: true } } },
  });
  chips63.forEach((c: any) => console.log(` ${c.user.name} [${c.league.name}] type:${c.chipType}`));

  // All chips in system
  console.log('\nAll chips in system:');
  const allChips = await db.chipUsage.findMany({
    include: { user: { select: { name: true } }, league: { select: { name: true } } },
    orderBy: { usedAt: 'asc' },
  });
  allChips.forEach((c: any) => console.log(` ${c.user.name} [${c.league.name}] match:${c.matchNumber} phase:${c.phase} type:${c.chipType}`));
  console.log(`\nTotal chips in system: ${allChips.length}`);

  // Match 63 result
  const result63 = await db.fixtureResult.findUnique({ where: { matchNumber: 63 } });
  console.log('\nMatch 63 result:', result63 ? `${result63.result} (${result63.goals1}-${result63.goals2})` : 'not recorded yet');
}

main().catch(console.error).finally(() => db.$disconnect());
