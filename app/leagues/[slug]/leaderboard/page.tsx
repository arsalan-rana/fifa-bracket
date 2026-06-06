'use client';

import { use, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import { useSession } from 'next-auth/react';

interface Props {
  params: Promise<{ slug: string }>;
}

interface LeaderboardEntry {
  rank: number;
  prevRank: number | null;
  totalPoints: number;
  groupPoints: number;
  round32Points: number;
  round16Points: number;
  quarterPoints: number;
  semiPoints: number;
  finalPoints: number;
  bonusPoints: number;
  penalty: number;
  user: { name: string | null; email: string; image: string | null };
}

function RankDelta({ rank, prevRank }: { rank: number; prevRank: number | null }) {
  if (!prevRank || prevRank === rank) return <RemoveIcon sx={{ fontSize: 14, color: 'text.secondary' }} />;
  if (prevRank > rank) return <ArrowUpwardIcon sx={{ fontSize: 14, color: 'success.main' }} />;
  return <ArrowDownwardIcon sx={{ fontSize: 14, color: 'error.main' }} />;
}

export default function LeaderboardPage({ params }: Props) {
  const { slug } = use(params);
  const { data: session } = useSession();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);

        const res = await fetch(`/api/get-leaderboard?leagueId=${leagueData.id}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
          🏆 Leaderboard
        </Typography>

        {entries.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No scores yet. Submit picks and refresh the leaderboard.
            </Typography>
          </Card>
        ) : (
          <Card sx={{ overflow: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'rgba(0,61,165,0.2)' }}>
                  <TableCell sx={{ fontWeight: 700, width: 50 }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Player</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right', display: { xs: 'none', sm: 'table-cell' } }}>Groups</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right', display: { xs: 'none', md: 'table-cell' } }}>Knockouts</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right', display: { xs: 'none', sm: 'table-cell' } }}>Bonus</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'right', display: { xs: 'none', md: 'table-cell' } }}>Penalty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry, idx) => {
                  const isMe = entry.user.email === session?.user?.email;
                  const knockoutPts =
                    entry.round32Points +
                    entry.round16Points +
                    entry.quarterPoints +
                    entry.semiPoints +
                    entry.finalPoints;

                  return (
                    <TableRow
                      key={entry.user.email}
                      sx={{
                        background: isMe ? 'rgba(0,61,165,0.1)' : 'transparent',
                        '&:hover': { background: 'rgba(255,255,255,0.03)' },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 800 }} color={idx === 0 ? 'secondary.main' : 'text.primary'}>
                            {idx < 3 ? medals[idx] : idx + 1}
                          </Typography>
                          <RankDelta rank={entry.rank} prevRank={entry.prevRank} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar src={entry.user.image ?? undefined} sx={{ width: 30, height: 30 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: isMe ? 700 : 400 }}>
                              {entry.user.name ?? entry.user.email}
                              {isMe && (
                                <Chip label="you" size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontWeight: 800 }} color="secondary.main">
                          {entry.totalPoints}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', display: { xs: 'none', sm: 'table-cell' } }}>
                        {entry.groupPoints}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', display: { xs: 'none', md: 'table-cell' } }}>
                        {knockoutPts}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', display: { xs: 'none', sm: 'table-cell' } }}>
                        {entry.bonusPoints > 0 && (
                          <Typography color="success.main">+{entry.bonusPoints}</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', display: { xs: 'none', md: 'table-cell' } }}>
                        {entry.penalty > 0 && (
                          <Typography color="error.main">-{entry.penalty}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </Container>
    </Box>
  );
}
