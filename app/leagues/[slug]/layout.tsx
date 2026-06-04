import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { db } from '../../../lib/db';
import NavBar from '../../components/NavBar';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function LeagueLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect(`/api/auth/signin?callbackUrl=/leagues/${slug}`);
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/');

  const league = await db.league.findUnique({ where: { slug } });
  if (!league) notFound();

  const isMember = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
  });
  if (!isMember) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar leagueSlug={slug} leagueName={league.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
