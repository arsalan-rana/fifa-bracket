'use client';

import { use, useEffect, useState, useRef } from 'react';
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
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  statusMessage: string | null;
  userId: string;
  user: { name: string | null; email: string; image: string | null };
}

interface TauntReaction {
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface TauntInfo {
  id: string;
  emoji: string;
  label: string;
  fromName: string;
  isSelf: boolean;
  createdAt: string;
  reactions: TauntReaction[];
}

interface PickRow {
  matchNumber: number;
  phase: string;
  team1Flag: string; team1Name: string; team1: string;
  team2Flag: string; team2Name: string; team2: string;
  date: string;
  predictedWinner: string | null;
  submittedAt: string | null;
  isLate: boolean;
  actualResult: string | null;
  correct: boolean | null;
  pointsEarned: number;
  cumulative: number;
}

const CRUDE_TAUNT_SLUGS = new Set(['fantasy-frauds', 'bwooyyss', 'chawals']);

const BASE_TAUNT_PRESETS = [
  { emoji: '🔥', label: 'on fire' },
  { emoji: '😬', label: 'unlucky' },
  { emoji: '👀', label: 'watching you' },
  { emoji: '🏆', label: 'too easy' },
  { emoji: '😴', label: 'wake up' },
  { emoji: '🤞', label: 'still got time' },
  { emoji: '🎰', label: 'this site is rigged' },
];

const CRUDE_TAUNT = { emoji: '🖕', label: 'f**k off' };

function getTauntPresets(slug: string) {
  return CRUDE_TAUNT_SLUGS.has(slug) ? [...BASE_TAUNT_PRESETS, CRUDE_TAUNT] : BASE_TAUNT_PRESETS;
}

const REACTION_EMOJIS = ['👏', '😭', '🔥', '💀', '🤣', '😤'];

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
  const [taunts, setTaunts] = useState<Record<string, TauntInfo[]>>({});
  const [myActiveTaunts, setMyActiveTaunts] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Taunt dialog
  const [tauntTarget, setTauntTarget] = useState<{ email: string; name: string } | null>(null);
  const [sendingTaunt, setSendingTaunt] = useState(false);
  const [sentTaunt, setSentTaunt] = useState<string | null>(null);

  // Status dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Picks breakdown dialog
  const [picksTarget, setPicksTarget] = useState<{ userId: string; name: string } | null>(null);
  const [picksData, setPicksData] = useState<PickRow[]>([]);
  const [picksLoading, setPicksLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);

        const [lbRes, tauntRes, notifRes] = await Promise.all([
          fetch(`/api/get-leaderboard?leagueId=${leagueData.id}`),
          fetch(`/api/get-taunts?leagueId=${leagueData.id}`),
          fetch(`/api/notifications?leagueId=${leagueData.id}`),
        ]);

        if (lbRes.ok) {
          const data = await lbRes.json();
          setEntries(data.entries);
        }
        if (tauntRes.ok) {
          const data = await tauntRes.json();
          setTaunts(data.taunts);
          setMyActiveTaunts(data.myActiveTaunts ?? 0);
        }
        if (notifRes.ok) {
          const data = await notifRes.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

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
          id: `temp-${Date.now()}`,
          emoji,
          label,
          fromName: session?.user?.name ?? session?.user?.email ?? 'You',
          isSelf: false,
          createdAt: new Date().toISOString(),
          reactions: [],
        };
        setTaunts((prev) => ({
          ...prev,
          [tauntTarget.email]: [newTaunt, ...(prev[tauntTarget.email] ?? [])].slice(0, 5),
        }));
        setMyActiveTaunts((n) => n + 1);
        setSentTaunt(emoji);
        setTimeout(() => {
          setSentTaunt(null);
          setTauntTarget(null);
        }, 1200);
      } else if (res.status === 429) {
        alert('You already have 3 active taunts in this league. Wait for one to expire (24h) before sending another.');
        setTauntTarget(null);
      }
    } finally {
      setSendingTaunt(false);
    }
  }

  async function reactToTaunt(tauntId: string, toEmail: string, emoji: string) {
    const res = await fetch('/api/react-taunt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tauntId, emoji }),
    });
    if (!res.ok) return;
    const { action } = await res.json();

    setTaunts((prev) => {
      const list = prev[toEmail] ?? [];
      return {
        ...prev,
        [toEmail]: list.map((t) => {
          if (t.id !== tauntId) return t;
          const myOldEmoji = t.reactions.find((r) => r.myReaction)?.emoji;
          const updated = t.reactions.map((r) => {
            if (r.emoji === emoji) {
              return {
                ...r,
                count: action === 'removed' ? r.count - 1 : r.count + (myOldEmoji === emoji ? 0 : 1),
                myReaction: action !== 'removed' && r.emoji === emoji,
              };
            }
            if (r.emoji === myOldEmoji && action !== 'removed') {
              return { ...r, count: Math.max(0, r.count - 1), myReaction: false };
            }
            return r;
          });
          // If emoji not in list yet, add it
          if (!updated.find((r) => r.emoji === emoji)) {
            updated.push({ emoji, count: 1, myReaction: true });
          }
          return { ...t, reactions: updated.filter((r) => r.count > 0) };
        }),
      };
    });
  }

  async function saveStatus() {
    setSavingStatus(true);
    try {
      await fetch('/api/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, message: statusText }),
      });
      // Update local entry
      const myEmail = session?.user?.email;
      setEntries((prev) =>
        prev.map((e) =>
          e.user.email === myEmail ? { ...e, statusMessage: statusText || null } : e
        )
      );
      setStatusDialogOpen(false);
    } finally {
      setSavingStatus(false);
    }
  }

  async function openPicks(userId: string, name: string) {
    setPicksTarget({ userId, name });
    setPicksData([]);
    setPicksLoading(true);
    try {
      const res = await fetch(`/api/pick-breakdown?leagueId=${leagueId}&userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPicksData(data.picks);
      }
    } finally {
      setPicksLoading(false);
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            🏆 Leaderboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {myActiveTaunts > 0 && (
              <Chip
                label={`${myActiveTaunts}/3 taunts active`}
                size="small"
                color={myActiveTaunts >= 3 ? 'error' : 'warning'}
                sx={{ fontSize: '0.7rem' }}
              />
            )}
            <IconButton
              component={Link}
              href={`/leagues/${slug}/notifications`}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <Badge badgeContent={unreadCount} color="error" max={9}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Box>
        </Box>

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
                              {/* Status message */}
                              {entry.statusMessage && (
                                <Typography variant="caption" color="secondary.main" sx={{ lineHeight: 1.3, display: 'block', fontStyle: 'italic' }}>
                                  💬 {entry.statusMessage}
                                </Typography>
                              )}
                              {/* Taunts */}
                              {receivedTaunts.map((t) => (
                                <Box key={t.id}>
                                  <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.3, display: 'block' }}>
                                    {t.emoji} {t.label}{!t.isSelf && ` · from ${t.fromName}`}
                                  </Typography>
                                  {/* Reactions row */}
                                  {t.reactions.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.25 }}>
                                      {t.reactions.map((r) => (
                                        <Chip
                                          key={r.emoji}
                                          label={`${r.emoji} ${r.count}`}
                                          size="small"
                                          onClick={(e) => { e.stopPropagation(); reactToTaunt(t.id, entry.user.email, r.emoji); }}
                                          sx={{
                                            height: 18,
                                            fontSize: '0.65rem',
                                            bgcolor: r.myReaction ? 'rgba(201,167,58,0.25)' : 'rgba(255,255,255,0.05)',
                                            border: r.myReaction ? '1px solid rgba(201,167,58,0.5)' : '1px solid transparent',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                                          }}
                                        />
                                      ))}
                                      {/* Add reaction button */}
                                      <Chip
                                        label="+"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const pick = window.prompt(`React with: ${REACTION_EMOJIS.join(' ')}`);
                                          if (pick && REACTION_EMOJIS.includes(pick.trim())) {
                                            reactToTaunt(t.id, entry.user.email, pick.trim());
                                          }
                                        }}
                                        sx={{ height: 18, fontSize: '0.65rem', cursor: 'pointer', color: 'text.disabled' }}
                                      />
                                    </Box>
                                  )}
                                  {t.reactions.length === 0 && (
                                    <Box>
                                      {REACTION_EMOJIS.map((emoji) => (
                                        <Typography
                                          key={emoji}
                                          component="span"
                                          onClick={(e) => { e.stopPropagation(); reactToTaunt(t.id, entry.user.email, emoji); }}
                                          sx={{ fontSize: '0.75rem', cursor: 'pointer', opacity: 0.4, '&:hover': { opacity: 1 }, mr: 0.25 }}
                                        >
                                          {emoji}
                                        </Typography>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              ))}
                            </Box>
                            <Chip
                              label="📊"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPicks(entry.userId, entry.user.name ?? entry.user.email.split('@')[0]);
                              }}
                              title="View pick breakdown"
                              sx={{ flexShrink: 0, cursor: 'pointer', fontSize: '0.75rem', '&:hover': { bgcolor: 'rgba(201,167,58,0.2)', borderColor: 'secondary.main' } }}
                            />
                            {session && (
                              <>
                                {isMe ? (
                                  <Chip
                                    label="📣"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStatusText(entry.statusMessage ?? '');
                                      setStatusDialogOpen(true);
                                    }}
                                    title="Set your status"
                                    sx={{ flexShrink: 0, cursor: 'pointer', fontSize: '0.75rem', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                                  />
                                ) : (
                                  <Chip
                                    label="⚡"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTauntTarget({ email: entry.user.email, name: entry.user.name ?? entry.user.email.split('@')[0] });
                                    }}
                                    title="Send a taunt"
                                    sx={{ flexShrink: 0, cursor: 'pointer', fontSize: '0.75rem', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                                  />
                                )}
                              </>
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
                                { label: 'Penalty', value: -entry.penalty, color: entry.penalty > 0 ? 'error.main' : undefined },
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
            {sentTaunt ? `${sentTaunt} Done!` : `Taunt ${tauntTarget?.name}`}
          </Typography>
          <IconButton size="small" onClick={() => setTauntTarget(null)} disabled={sendingTaunt}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          {sentTaunt ? (
            <Typography sx={{ fontSize: '3rem', textAlign: 'center' }}>{sentTaunt}</Typography>
          ) : (
            <>
              {myActiveTaunts >= 3 && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  You have 3 active taunts — wait 24h for one to expire before sending more.
                </Typography>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 0.5 }}>
                {getTauntPresets(slug).map(({ emoji, label }) => (
                  <Box
                    key={emoji}
                    onClick={() => myActiveTaunts < 3 ? sendTaunt(emoji, label) : undefined}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: myActiveTaunts >= 3 || sendingTaunt ? 'not-allowed' : 'pointer',
                      opacity: myActiveTaunts >= 3 || sendingTaunt ? 0.4 : 1,
                      '&:hover': myActiveTaunts < 3 ? { bgcolor: 'action.hover', borderColor: 'primary.main' } : {},
                      transition: 'all 0.15s',
                    }}
                  >
                    <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>{emoji}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Picks breakdown dialog */}
      <Dialog
        open={!!picksTarget}
        onClose={() => setPicksTarget(null)}
        maxWidth="sm"
        fullWidth
        fullScreen={typeof window !== 'undefined' && window.innerWidth < 600}
        sx={{ '& .MuiDialog-paper': { maxHeight: { xs: '100vh', sm: '85vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            📊 {picksTarget?.name}&apos;s picks
          </Typography>
          <IconButton size="small" onClick={() => setPicksTarget(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
          {picksLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress color="secondary" size={32} />
            </Box>
          ) : (
            <Box>
              {picksData.filter(p => p.actualResult !== null || p.predictedWinner !== null).map((pick, idx, arr) => {
                const played = pick.actualResult !== null;
                const pickedName = !pick.predictedWinner ? null
                  : pick.predictedWinner === 'DRAW' ? 'Draw'
                  : pick.predictedWinner === pick.team1 ? `${pick.team1Flag} ${pick.team1Name}`
                  : `${pick.team2Flag} ${pick.team2Name}`;
                const resultName = !pick.actualResult ? null
                  : pick.actualResult === 'DRAW' ? 'Draw'
                  : pick.actualResult === pick.team1 ? `${pick.team1Flag} ${pick.team1Name}`
                  : `${pick.team2Flag} ${pick.team2Name}`;
                const matchDate = new Date(pick.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const submittedLabel = pick.submittedAt
                  ? new Date(pick.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                  : null;
                const borderColor = !played ? 'divider'
                  : pick.correct ? 'rgba(34,197,94,0.4)'
                  : 'rgba(239,68,68,0.3)';
                const bg = !played ? 'transparent'
                  : pick.correct ? 'rgba(34,197,94,0.06)'
                  : 'rgba(239,68,68,0.05)';

                return (
                  <Box
                    key={pick.matchNumber}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: idx < arr.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      borderLeft: '3px solid',
                      borderLeftColor: borderColor,
                      bgcolor: bg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    {/* Left: outcome icon */}
                    <Typography sx={{ fontSize: '1.1rem', flexShrink: 0, width: 22, textAlign: 'center' }}>
                      {!played ? '🕐' : pick.correct ? '✅' : '❌'}
                    </Typography>

                    {/* Middle: match info + pick/result */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pick.team1Flag} {pick.team1Name} vs {pick.team2Flag} {pick.team2Name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', display: 'block', lineHeight: 1.4 }}>
                        {matchDate} · M{pick.matchNumber}
                        {pick.isLate && <span style={{ color: '#f87171', marginLeft: 4 }}>late</span>}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                          {pickedName ?? <span style={{ color: 'rgba(255,255,255,0.3)' }}>no pick</span>}
                        </Typography>
                        {played && (
                          <>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>→</Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.72rem', color: pick.correct ? 'success.main' : 'error.main', fontWeight: pick.correct ? 600 : 400 }}>
                              {resultName}
                            </Typography>
                          </>
                        )}
                        {submittedLabel && (
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem', ml: 0.5 }}>
                            · {submittedLabel}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Right: pts + cumulative */}
                    <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2, color: pick.pointsEarned > 0 ? 'secondary.main' : played ? 'text.disabled' : 'text.disabled' }}>
                        {pick.pointsEarned > 0 ? `+${pick.pointsEarned}` : played ? '0' : '—'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', lineHeight: 1.2 }}>
                        {pick.cumulative} total
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Status dialog */}
      <Dialog open={statusDialogOpen} onClose={() => !savingStatus && setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>📣 Set your status</Typography>
          <IconButton size="small" onClick={() => setStatusDialogOpen(false)} disabled={savingStatus}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Your status shows next to your name for 24 hours.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            placeholder="e.g. feeling confident 🔥"
            value={statusText}
            onChange={(e) => setStatusText(e.target.value.slice(0, 60))}
            helperText={`${statusText.length}/60`}
            size="small"
            onKeyDown={(e) => { if (e.key === 'Enter') saveStatus(); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          {statusText && (
            <Button
              size="small"
              color="error"
              onClick={() => { setStatusText(''); saveStatus(); }}
              disabled={savingStatus}
            >
              Clear
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setStatusDialogOpen(false)} disabled={savingStatus} size="small">
            Cancel
          </Button>
          <Button variant="contained" onClick={saveStatus} disabled={savingStatus} size="small">
            {savingStatus ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
