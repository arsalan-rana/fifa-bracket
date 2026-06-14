'use client';

import { use, useEffect, useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatBubbleOutlinedIcon from '@mui/icons-material/ChatBubbleOutlined';
import PeopleIcon from '@mui/icons-material/People';
import SendIcon from '@mui/icons-material/Send';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useSession } from 'next-auth/react';
import {
  GROUPS,
  GROUP_FIXTURES,
  KNOCKOUT_FIXTURES,
  TEAMS,
  PHASES,
  isPhasePastDeadline,
} from '../../../../data/fifa-2026';
import type { Phase, Fixture } from '../../../../data/fifa-2026';

interface Props {
  params: Promise<{ slug: string }>;
}

interface Comment {
  id: string;
  matchNumber: number;
  text: string;
  createdAt: string;
  user: { name: string | null; email: string; image: string | null };
}

type Picker = { name: string; image: string | null; email: string; goals1?: number | null; goals2?: number | null };
type Picks = Record<number, Record<string, Picker[]>>;
type Scores = Record<number, { name: string; image: string | null; goals1: number; goals2: number }[]>;

interface MyPrediction {
  predictedWinner: string;
  goals1: number | null;
  goals2: number | null;
}

const PHASE_LABELS: Record<Phase, string> = {
  group: 'Group Stage',
  round32: 'Round of 32',
  round16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  final: 'Final',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Picks Section ────────────────────────────────────────────────────────────

function PicksSection({ fixture, picksForMatch, scoresForMatch }: { fixture: Fixture; picksForMatch: Record<string, Picker[]>; scoresForMatch: { name: string; image: string | null; goals1: number; goals2: number }[] }) {
  const opts = [
    { code: fixture.team1 },
    ...(fixture.canDraw ? [{ code: 'DRAW' }] : []),
    { code: fixture.team2 },
  ];

  // Build display list: all opts that appear in picks, plus any extra unexpected codes
  const allCodes = new Set([
    ...opts.map((o) => o.code),
    ...Object.keys(picksForMatch),
  ]);
  const sorted = [...allCodes].sort((a, b) => (picksForMatch[b]?.length ?? 0) - (picksForMatch[a]?.length ?? 0));

  const total = Object.values(picksForMatch).reduce((s, a) => s + a.length, 0);

  return (
    <Box
      sx={{
        px: 2,
        pt: 1.5,
        pb: 2,
        bgcolor: 'action.hover',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', mb: 1.5, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}
      >
        👥 League Picks · {total} submitted
      </Typography>

      {total === 0 ? (
        <Typography variant="caption" color="text.disabled">No picks submitted for this match</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sorted.map((code) => {
            const pickers = picksForMatch[code] ?? [];
            const pct = total > 0 ? Math.round((pickers.length / total) * 100) : 0;
            const team = TEAMS[code];
            const isDraw = code === 'DRAW';
            const label = isDraw ? '🤝 Draw' : `${team?.flag ?? ''} ${team?.name ?? code}`;
            const barColor = isDraw ? '#6B7280' : (team?.primaryColor ?? '#3B82F6');

            return (
              <Box key={code}>
                {/* Label + count row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {pickers.length} pick{pickers.length !== 1 ? 's' : ''}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: barColor,
                        minWidth: 34,
                        textAlign: 'right',
                      }}
                    >
                      {pct}%
                    </Typography>
                  </Box>
                </Box>

                {/* Bar */}
                <Box
                  sx={{
                    height: 7,
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                    overflow: 'hidden',
                    mb: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${pct}%`,
                      bgcolor: barColor,
                      borderRadius: 4,
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: pickers.length === 0 ? 0 : 1,
                    }}
                  />
                </Box>

                {/* Avatar strip */}
                {pickers.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {pickers.map((p) => (
                      <Tooltip key={p.email} title={p.name} placement="top" arrow>
                        <Avatar
                          src={p.image ?? undefined}
                          sx={{
                            width: 26,
                            height: 26,
                            fontSize: '0.65rem',
                            border: `2px solid ${barColor}44`,
                          }}
                        >
                          {!p.image && (p.name[0]?.toUpperCase() ?? '?')}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Score predictions */}
      {scoresForMatch.length > 0 && (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', mb: 1, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}
          >
            ⚽ Score Predictions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {scoresForMatch.map((s) => (
              <Box
                key={s.name}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5,
                  borderRadius: 2, bgcolor: 'rgba(201,167,58,0.1)', border: '1px solid rgba(201,167,58,0.2)',
                }}
              >
                <Avatar src={s.image ?? undefined} sx={{ width: 20, height: 20, fontSize: '0.6rem' }}>
                  {!s.image && s.name[0]?.toUpperCase()}
                </Avatar>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>{s.name}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', fontSize: '0.75rem' }}>
                  {s.goals1}–{s.goals2}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Comment Thread ───────────────────────────────────────────────────────────

function CommentThread({
  matchNumber,
  leagueId,
  comments,
  onNewComment,
}: {
  matchNumber: number;
  leagueId: string;
  comments: Comment[];
  onNewComment: (c: Comment) => void;
}) {
  const { data: session } = useSession();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(comments.length);

  // Only scroll when a genuinely new comment arrives — not on mount
  useEffect(() => {
    if (comments.length > prevLengthRef.current) {
      inputWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevLengthRef.current = comments.length;
  }, [comments.length]);

  async function submit() {
    if (!text.trim() || posting || !leagueId) return;
    setPosting(true);
    try {
      const res = await fetch('/api/match-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, matchNumber, text }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        onNewComment(comment);
        setText('');
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <Box sx={{ pt: 1.5, pb: 1.5, px: 1.5, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
      {comments.length === 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1.5, textAlign: 'center' }}>
          No comments yet — be first to react
        </Typography>
      )}
      {comments.map((c) => (
        <Box key={c.id} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Avatar src={c.user.image ?? undefined} sx={{ width: 28, height: 28, mt: 0.25, flexShrink: 0, fontSize: '0.65rem' }}>
            {!c.user.image && (c.user.name?.[0] ?? c.user.email[0]).toUpperCase()}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {c.user.email === session?.user?.email ? 'You' : (c.user.name ?? c.user.email.split('@')[0])}
              </Typography>
              <Typography variant="caption" color="text.disabled">{timeAgo(c.createdAt)}</Typography>
            </Box>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{c.text}</Typography>
          </Box>
        </Box>
      ))}

      {session && (
        <Box
          ref={inputWrapperRef}
          sx={{ display: 'flex', gap: 1, mt: comments.length > 0 ? 1.5 : 0, alignItems: 'flex-end' }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            onFocus={() => {
              // Wait for mobile keyboard to finish sliding up before scrolling
              setTimeout(() => {
                inputWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 350);
            }}
            multiline
            minRows={1}
            maxRows={4}
            slotProps={{
              htmlInput: {
                enterKeyHint: 'send',
                autoCapitalize: 'sentences',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': { fontSize: '0.9rem', borderRadius: 3 },
            }}
          />
          <IconButton
            onClick={submit}
            disabled={!text.trim() || posting}
            sx={{
              alignSelf: 'flex-end',
              color: 'primary.main',
              width: 40,
              height: 40,
              flexShrink: 0,
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

// ─── Score Dialog ─────────────────────────────────────────────────────────────

function ScoreSpinner({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <IconButton size="small" onClick={() => onChange(Math.min(20, value + 1))} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <AddIcon fontSize="small" />
      </IconButton>
      <Typography variant="h3" sx={{ fontWeight: 900, minWidth: 56, textAlign: 'center', color: 'secondary.main', lineHeight: 1.2 }}>
        {value}
      </Typography>
      <IconButton size="small" onClick={() => onChange(Math.max(0, value - 1))} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <RemoveIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function ScoreDialog({
  fixture,
  leagueId,
  initialGoals1,
  initialGoals2,
  onClose,
  onSaved,
}: {
  fixture: Fixture;
  leagueId: string;
  initialGoals1: number | null;
  initialGoals2: number | null;
  onClose: () => void;
  onSaved: (g1: number, g2: number) => void;
}) {
  const [g1, setG1] = useState(initialGoals1 ?? 0);
  const [g2, setG2] = useState(initialGoals2 ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const team1 = TEAMS[fixture.team1];
  const team2 = TEAMS[fixture.team2];

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, matchNumber: fixture.matchNumber, goals1: g1, goals2: g2 }),
      });
      if (res.ok) {
        onSaved(g1, g2);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>⚽ Predict Score</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {new Date(fixture.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 3 }}>
          {/* Team 1 */}
          <Box sx={{ textAlign: 'center', minWidth: 72 }}>
            <Typography sx={{ fontSize: '2.5rem', lineHeight: 1 }}>{team1?.flag ?? '🏳'}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
              {team1?.name ?? fixture.team1}
            </Typography>
          </Box>

          {/* Score spinners */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ScoreSpinner value={g1} onChange={setG1} />
            <Typography variant="h5" sx={{ color: 'text.disabled', fontWeight: 300 }}>–</Typography>
            <ScoreSpinner value={g2} onChange={setG2} />
          </Box>

          {/* Team 2 */}
          <Box sx={{ textAlign: 'center', minWidth: 72 }}>
            <Typography sx={{ fontSize: '2.5rem', lineHeight: 1 }}>{team2?.flag ?? '🏳'}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
              {team2?.name ?? fixture.team2}
            </Typography>
          </Box>
        </Box>

        {error && <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>{error}</Typography>}

        <Button
          fullWidth
          variant="contained"
          color="secondary"
          onClick={save}
          disabled={saving}
          sx={{ fontWeight: 700, py: 1.25 }}
        >
          {saving ? 'Saving…' : initialGoals1 !== null ? 'Update Prediction' : 'Save Prediction'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Match Row ────────────────────────────────────────────────────────────────

interface MatchRowProps {
  fixture: Fixture;
  label: React.ReactNode;
  isPastDeadline: boolean;
  commentsOpen: boolean;
  picksOpen: boolean;
  comments: Comment[];
  picksForMatch: Record<string, Picker[]>;
  scoresForMatch: { name: string; image: string | null; goals1: number; goals2: number }[];
  leagueId: string;
  myPrediction: MyPrediction | null;
  scoreEnabled: boolean;
  onToggleComments: () => void;
  onTogglePicks: () => void;
  onNewComment: (c: Comment) => void;
  onOpenScore: () => void;
}

function MatchRow({
  fixture,
  label,
  isPastDeadline,
  commentsOpen,
  picksOpen,
  comments,
  picksForMatch,
  scoresForMatch,
  leagueId,
  myPrediction,
  scoreEnabled,
  onToggleComments,
  onTogglePicks,
  onNewComment,
  onOpenScore,
}: MatchRowProps) {
  const totalPicks = Object.values(picksForMatch).reduce((s, a) => s + a.length, 0);
  const isAnyOpen = commentsOpen || picksOpen;
  const rowRef = useRef<HTMLDivElement>(null);
  const kickedOff = new Date(fixture.date) <= new Date();
  const hasScore = myPrediction?.goals1 !== null && myPrediction?.goals2 !== null && myPrediction?.goals1 !== undefined;

  // When a panel opens, wait for Collapse animation then scroll the row to a sensible position
  useEffect(() => {
    if (commentsOpen || picksOpen) {
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 280);
    }
  }, [commentsOpen, picksOpen]);

  const winnerLabel = myPrediction
    ? myPrediction.predictedWinner === 'DRAW'
      ? '🤝 Draw'
      : `${TEAMS[myPrediction.predictedWinner]?.flag ?? ''} ${TEAMS[myPrediction.predictedWinner]?.name ?? myPrediction.predictedWinner}`
    : null;

  return (
    <Box ref={rowRef} sx={{ borderBottom: isAnyOpen ? 'none' : '1px solid', borderColor: isAnyOpen ? 'transparent' : 'divider' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          gap: 1,
          px: 0.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {/* Date/time */}
        <Box sx={{ minWidth: 64, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
            {new Date(fixture.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.3, fontSize: '0.6rem' }}>
            {new Date(fixture.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' })}
          </Typography>
        </Box>

        {/* Match name + pick hint */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap>{label}</Typography>
          {myPrediction && (
            <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block', lineHeight: 1.4 }}>
              {winnerLabel}{hasScore ? ` · ${myPrediction.goals1}–${myPrediction.goals2}` : ''}
            </Typography>
          )}
        </Box>

        {/* City */}
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
          {fixture.city}
        </Typography>

        {/* Score button — only when scoreEnabled and winner is picked and not kicked off */}
        {scoreEnabled && myPrediction && !kickedOff && (
          <Chip
            size="small"
            label={hasScore ? `${myPrediction.goals1}–${myPrediction.goals2}` : '⚽'}
            onClick={onOpenScore}
            sx={{
              flexShrink: 0,
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              cursor: 'pointer',
              bgcolor: hasScore ? 'rgba(201,167,58,0.15)' : 'action.hover',
              color: hasScore ? 'secondary.main' : 'text.disabled',
              border: '1px solid',
              borderColor: hasScore ? 'secondary.main' : 'divider',
              '&:hover': { bgcolor: 'secondary.main', color: 'background.default' },
            }}
          />
        )}

        {/* Picks toggle — only after deadline */}
        {isPastDeadline && (
          <Box
            onClick={onTogglePicks}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'pointer', flexShrink: 0,
              color: picksOpen ? 'secondary.main' : 'text.disabled', px: 0.75, py: 0.5, borderRadius: 1,
              '&:hover': { color: 'secondary.main', bgcolor: 'action.hover' }, transition: 'color 0.15s',
            }}
          >
            <PeopleIcon sx={{ fontSize: 14 }} />
            {totalPicks > 0 && (
              <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1, fontWeight: 600 }}>
                {totalPicks}
              </Typography>
            )}
          </Box>
        )}

        {/* Comments toggle */}
        <Box
          onClick={onToggleComments}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'pointer', flexShrink: 0,
            color: commentsOpen ? 'primary.main' : 'text.disabled', px: 0.75, py: 0.5, borderRadius: 1,
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' }, transition: 'color 0.15s',
          }}
        >
          <ChatBubbleOutlinedIcon sx={{ fontSize: 14 }} />
          {comments.length > 0 && (
            <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1, fontWeight: 600 }}>
              {comments.length}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Picks panel */}
      {isPastDeadline && (
        <Collapse in={picksOpen} unmountOnExit>
          <PicksSection fixture={fixture} picksForMatch={picksForMatch} scoresForMatch={scoresForMatch} />
        </Collapse>
      )}

      {/* Comment panel */}
      <Collapse in={commentsOpen} unmountOnExit>
        <CommentThread
          matchNumber={fixture.matchNumber}
          leagueId={leagueId}
          comments={comments}
          onNewComment={onNewComment}
        />
      </Collapse>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FixturesPage({ params }: Props) {
  const { slug } = use(params);
  const [leagueId, setLeagueId] = useState('');
  const [scoreEnabled, setScoreEnabled] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [picks, setPicks] = useState<Picks>({});
  const [scores, setScores] = useState<Scores>({});
  const [myPreds, setMyPreds] = useState<Record<number, MyPrediction>>({});
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [openPicks, setOpenPicks] = useState<Set<number>>(new Set());
  const [groupBy, setGroupBy] = useState<'group' | 'date'>('date');
  const [scoreDialog, setScoreDialog] = useState<Fixture | null>(null);

  useEffect(() => {
    async function load() {
      const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
      if (!leagueRes.ok) return;
      const leagueData = await leagueRes.json();
      setLeagueId(leagueData.id);
      setScoreEnabled(!!leagueData.scoreEnabled);

      const [cRes, pRes, myRes] = await Promise.all([
        fetch(`/api/match-comments?leagueId=${leagueData.id}`),
        fetch(`/api/match-picks?leagueId=${leagueData.id}`),
        fetch(`/api/get-predictions?leagueId=${leagueData.id}`),
      ]);
      if (cRes.ok) setComments((await cRes.json()).comments);
      if (pRes.ok) {
        const data = await pRes.json();
        setPicks(data.picks);
        setScores(data.scores ?? {});
      }
      if (myRes.ok) {
        const { predictions } = await myRes.json();
        const map: Record<number, MyPrediction> = {};
        for (const p of predictions) {
          map[p.matchNumber] = { predictedWinner: p.predictedWinner, goals1: p.goals1 ?? null, goals2: p.goals2 ?? null };
        }
        setMyPreds(map);
      }
    }
    load();
  }, [slug]);

  const commentsFor = useCallback(
    (matchNumber: number) => comments.filter((c) => c.matchNumber === matchNumber),
    [comments],
  );

  const addComment = useCallback((c: Comment) => {
    setComments((prev) => [...prev, c]);
  }, []);

  function toggleComments(n: number) {
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  function togglePicks(n: number) {
    setOpenPicks((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  const groupDeadlinePassed = isPhasePastDeadline('group');

  function getGroupMatchesByDate(): { dayLabel: string; fixtures: Fixture[] }[] {
    const sorted = [...GROUP_FIXTURES].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groups: Map<string, Fixture[]> = new Map();
    for (const f of sorted) {
      const d = new Date(f.date);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(f);
    }
    return [...groups.entries()].map(([dayLabel, fixtures]) => ({ dayLabel, fixtures }));
  }

  function renderMatchRow(fixture: Fixture) {
    const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const matchDayET = new Date(fixture.date).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const matchStarted = matchDayET <= todayET;
    return (
      <MatchRow
        key={fixture.matchNumber}
        fixture={fixture}
        label={
          fixture.phase === 'group' ? (
            <>
              {TEAMS[fixture.team1]?.flag ?? ''}{' '}
              <strong>{TEAMS[fixture.team1]?.name ?? fixture.team1}</strong>
              {' vs '}
              <strong>{TEAMS[fixture.team2]?.name ?? fixture.team2}</strong>{' '}
              {TEAMS[fixture.team2]?.flag ?? ''}
            </>
          ) : (
            <Typography component="span" variant="body2" color="text.secondary">
              TBD vs TBD
            </Typography>
          )
        }
        isPastDeadline={matchStarted}
        commentsOpen={openComments.has(fixture.matchNumber)}
        picksOpen={openPicks.has(fixture.matchNumber)}
        comments={commentsFor(fixture.matchNumber)}
        picksForMatch={picks[fixture.matchNumber] ?? {}}
        scoresForMatch={scores[fixture.matchNumber] ?? []}
        leagueId={leagueId}
        myPrediction={myPreds[fixture.matchNumber] ?? null}
        scoreEnabled={scoreEnabled}
        onToggleComments={() => toggleComments(fixture.matchNumber)}
        onTogglePicks={() => togglePicks(fixture.matchNumber)}
        onNewComment={addComment}
        onOpenScore={() => setScoreDialog(fixture)}
      />
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
          <EventNoteIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
          Fixtures
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}>
          All 104 matches · June 11 – July 19, 2026
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 3 }}>
          Tap any match to see picks or leave a comment
          {groupDeadlinePassed ? '' : ' · Picks reveal after each phase deadline'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>
          {PHASES.map((phase) => (
            <Chip
              key={phase.id}
              label={`${phase.icon} ${phase.shortName}`}
              size="small"
              sx={{ background: `${phase.color}22`, color: phase.color, fontWeight: 600 }}
            />
          ))}
        </Box>

        {/* Group Stage */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Group Stage</Typography>
          <ToggleButtonGroup
            value={groupBy}
            exclusive
            onChange={(_, v) => { if (v) setGroupBy(v); }}
            size="small"
          >
            <ToggleButton value="group" sx={{ gap: 0.5, px: 1.5, fontSize: '0.75rem', textTransform: 'none' }}>
              <GroupWorkIcon sx={{ fontSize: 15 }} /> By Group
            </ToggleButton>
            <ToggleButton value="date" sx={{ gap: 0.5, px: 1.5, fontSize: '0.75rem', textTransform: 'none' }}>
              <CalendarTodayIcon sx={{ fontSize: 15 }} /> By Date
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {groupBy === 'group' ? (
          GROUPS.map((group) => {
            const fixtures = GROUP_FIXTURES.filter((f) => f.group === group);
            const teams = [...new Set(fixtures.flatMap((f) => [f.team1, f.team2]))].map((c) => TEAMS[c]);
            const groupCommentCount = fixtures.reduce((sum, f) => sum + commentsFor(f.matchNumber).length, 0);
            const groupPicksCount = fixtures.reduce(
              (sum, f) =>
                sum + Object.values(picks[f.matchNumber] ?? {}).reduce((s, a) => s + a.length, 0),
              0,
            );

            return (
              <Accordion
                key={group}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  mb: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', pr: 1 }}>
                    <Typography sx={{ fontWeight: 800 }}>Group {group}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flex: 1 }}>
                      {teams.map((t) => t && (
                        <Chip
                          key={t.code}
                          label={`${t.flag} ${t.code}`}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 18, background: `${t.primaryColor}22`, color: 'text.primary' }}
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      {groupDeadlinePassed && groupPicksCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: 'text.disabled' }}>
                          <PeopleIcon sx={{ fontSize: 13 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{groupPicksCount}</Typography>
                        </Box>
                      )}
                      {groupCommentCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: 'text.disabled' }}>
                          <ChatBubbleOutlinedIcon sx={{ fontSize: 13 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{groupCommentCount}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 1 }}>
                  {fixtures.map((f) => renderMatchRow(f))}
                </AccordionDetails>
              </Accordion>
            );
          })
        ) : (
          getGroupMatchesByDate().map(({ dayLabel, fixtures }) => (
            <Card key={dayLabel} sx={{ mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', fontWeight: 700, mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                >
                  {dayLabel} · {fixtures.length} match{fixtures.length !== 1 ? 'es' : ''}
                </Typography>
                {fixtures.map((f) => renderMatchRow(f))}
              </CardContent>
            </Card>
          ))
        )}

        {/* Knockout stages */}
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>
          Knockout Rounds — 32 Matches
        </Typography>

        {(['round32', 'round16', 'quarter', 'semi', 'final'] as Phase[]).map((phase) => {
          const fixtures = KNOCKOUT_FIXTURES.filter((f) => f.phase === phase);
          const phaseConfig = PHASES.find((p) => p.id === phase)!;
          const phaseDeadlinePassed = isPhasePastDeadline(phase);
          const phasePicksCount = fixtures.reduce(
            (sum, f) =>
              sum + Object.values(picks[f.matchNumber] ?? {}).reduce((s, a) => s + a.length, 0),
            0,
          );

          return (
            <Card key={phase} sx={{ mb: 2 }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: phaseConfig.color }}>
                    {phaseConfig.icon} {PHASE_LABELS[phase]}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {phaseDeadlinePassed && phasePicksCount > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: 'text.disabled' }}>
                        <PeopleIcon sx={{ fontSize: 13 }} />
                        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{phasePicksCount}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Deadline: {new Date(phaseConfig.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {phaseDeadlinePassed && (
                    <Chip label="Picks visible" size="small" sx={{ ml: 1, height: 16, fontSize: '0.6rem', bgcolor: 'rgba(34,197,94,0.1)', color: 'success.main' }} />
                  )}
                </Typography>
                {fixtures.map((f) => renderMatchRow(f))}
              </CardContent>
            </Card>
          );
        })}
      </Container>

      {/* Score prediction dialog */}
      {scoreDialog && (
        <ScoreDialog
          fixture={scoreDialog}
          leagueId={leagueId}
          initialGoals1={myPreds[scoreDialog.matchNumber]?.goals1 ?? null}
          initialGoals2={myPreds[scoreDialog.matchNumber]?.goals2 ?? null}
          onClose={() => setScoreDialog(null)}
          onSaved={(g1, g2) => {
            setMyPreds((prev) => ({
              ...prev,
              [scoreDialog.matchNumber]: { ...prev[scoreDialog.matchNumber]!, goals1: g1, goals2: g2 },
            }));
          }}
        />
      )}
    </Box>
  );
}
