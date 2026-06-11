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
import Collapse from '@mui/material/Collapse';
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  scorePoints: number;
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
                  <TableCell sx={{ width: 36 }} />
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
                  const isExpanded = expandedRows.has(entry.user.email);

                  function toggleExpand() {
                    setExpandedRows((prev) => {
                      const next = new Set(prev);
                      next.has(entry.user.email) ? next.delete(entry.user.email) : next.add(entry.user.email);
                      return next;
                    });
                  }

                  return (
                    <>
                      <TableRow
                        key={entry.user.email}
                        sx={{
                          background: isMe ? 'rgba(0,61,165,0.1)' : 'transparent',
                          '&:hover': { background: isMe ? 'rgba(0,61,165,0.15)' : 'rgba(255,255,255,0.03)' },
                          cursor: 'pointer',
                        }}
                        onClick={toggleExpand}
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
                              <Chip
                                label={isMe ? '📣' : '⚡'}
                                size="small"
                                onClick={(e) => { e.stopPropagation(); setTauntTarget({ email: entry.user.email, name: entry.user.name ?? entry.user.email.split('@')[0] }); }}
                                title={isMe ? 'Set status' : 'Send a taunt'}
                                sx={{ flexShrink: 0, cursor: 'pointer', fontSize: '0.75rem', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontWeight: 800 }} color="secondary.main">
                            {entry.totalPoints}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center', p: 0.5 }}>
                          <ExpandMoreIcon
                            sx={{
                              fontSize: 18,
                              color: 'text.disabled',
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                      <TableRow key={`${entry.user.email}-detail`} sx={{ background: 'transparent' }}>
                        <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} unmountOnExit>
                            <Box
                              sx={{
                                px: 3,
                                py: 1.5,
                                bgcolor: isMe ? 'rgba(0,61,165,0.07)' : 'rgba(255,255,255,0.02)',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                              }}
                            >
                              {[
                                { label: 'Groups', value: entry.groupPoints },
                                { label: 'Knockouts', value: knockoutPts },
                                { label: 'Scores', value: entry.scorePoints ?? 0, color: entry.scorePoints > 0 ? 'secondary.main' : undefined },
                                { label: 'Bonus', value: entry.bonusPoints, color: entry.bonusPoints > 0 ? 'success.main' : undefined },
                                { label: 'Penalty', value: -entry.penalty, color: entry.penalty > 0 ? 'error.main' : undefined, prefix: entry.penalty > 0 ? '' : undefined },
                              ].map(({ label, value, color }) => (
                                <Box key={label} sx={{ textAlign: 'center', minWidth: 56 }}>
                                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {label}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }} color={color ?? 'text.primary'}>
                                    {value > 0 && label !== 'Penalty' ? `+${value}` : value}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
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
