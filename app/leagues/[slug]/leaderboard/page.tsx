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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
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

interface TauntInfo {
  emoji: string;
  label: string;
  fromName: string;
  isSelf: boolean;
}

const TAUNT_PRESETS = [
  { emoji: '🔥', label: 'on fire' },
  { emoji: '😬', label: 'unlucky' },
  { emoji: '👀', label: 'watching you' },
  { emoji: '🏆', label: 'too easy' },
  { emoji: '😴', label: 'wake up' },
  { emoji: '🤞', label: 'still got time' },
  { emoji: '🎰', label: 'this site is rigged' },
];

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
  // taunts keyed by toUserId
  // taunts keyed by toUser email
  const [taunts, setTaunts] = useState<Record<string, TauntInfo[]>>({});
  // taunt dialog target
  const [tauntTarget, setTauntTarget] = useState<{ email: string; name: string } | null>(null);
  const [sendingTaunt, setSendingTaunt] = useState(false);
  const [sentTaunt, setSentTaunt] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);

        const [lbRes, tauntRes] = await Promise.all([
          fetch(`/api/get-leaderboard?leagueId=${leagueData.id}`),
          fetch(`/api/get-taunts?leagueId=${leagueData.id}`),
        ]);

        if (lbRes.ok) {
          const data = await lbRes.json();
          setEntries(data.entries);
        }
        if (tauntRes.ok) {
          const data = await tauntRes.json();
          setTaunts(data.taunts);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const isSelfTaunt = tauntTarget?.email === session?.user?.email;

  async function sendTaunt(emoji: string, label: string) {
    if (!tauntTarget || sendingTaunt) return;
    setSendingTaunt(true);
    try {
      const res = await fetch('/api/send-taunt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, toEmail: tauntTarget.email, emoji, label }),
      });
      if (res.ok) {
        const newTaunt: TauntInfo = {
          emoji,
          label,
          fromName: session?.user?.name ?? session?.user?.email ?? 'You',
          isSelf: isSelfTaunt,
        };
        setTaunts((prev) => ({
          ...prev,
          [tauntTarget.email]: [newTaunt, ...(prev[tauntTarget.email] ?? [])].slice(0, 5),
        }));
        setSentTaunt(emoji);
        setTimeout(() => {
          setSentTaunt(null);
          setTauntTarget(null);
        }, 1200);
      }
    } finally {
      setSendingTaunt(false);
    }
  }

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
                  const receivedTaunts = taunts[entry.user.email] ?? [];

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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={entry.user.image ?? undefined} sx={{ width: 30, height: 30, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: isMe ? 700 : 400 }}>
                              {entry.user.name ?? entry.user.email}
                              {isMe && (
                                <Chip label="you" size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem' }} />
                              )}
                            </Typography>
                            {receivedTaunts.map((t, i) => (
                              <Typography key={i} variant="caption" color="text.disabled" sx={{ lineHeight: 1.3, display: 'block' }}>
                                {t.emoji} {t.label}{!t.isSelf && ` · from ${t.fromName}`}
                              </Typography>
                            ))}
                          </Box>
                          {session && (
                            <IconButton
                              size="small"
                              onClick={() => setTauntTarget({ email: entry.user.email, name: entry.user.name ?? entry.user.email.split('@')[0] })}
                              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' }, flexShrink: 0, fontSize: '1rem' }}
                              title={isMe ? 'Set status' : 'Send a taunt'}
                            >
                              {isMe ? '📣' : '⚡'}
                            </IconButton>
                          )}
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

      {/* Taunt dialog */}
      <Dialog
        open={!!tauntTarget}
        onClose={() => { if (!sendingTaunt) setTauntTarget(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {sentTaunt ? `${sentTaunt} Done!` : isSelfTaunt ? '📣 Set your status' : `Taunt ${tauntTarget?.name}`}
          </Typography>
          <IconButton size="small" onClick={() => setTauntTarget(null)} disabled={sendingTaunt}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {sentTaunt ? (
            <Typography sx={{ fontSize: '3rem', textAlign: 'center' }}>{sentTaunt}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 0.5 }}>
              {TAUNT_PRESETS.map(({ emoji, label }) => (
                <Box
                  key={emoji}
                  onClick={() => sendTaunt(emoji, label)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: sendingTaunt ? 'not-allowed' : 'pointer',
                    opacity: sendingTaunt ? 0.5 : 1,
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                    transition: 'all 0.15s',
                  }}
                >
                  <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>{emoji}</Typography>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
