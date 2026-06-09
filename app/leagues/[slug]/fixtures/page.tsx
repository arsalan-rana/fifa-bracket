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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatBubbleOutlinedIcon from '@mui/icons-material/ChatBubbleOutlined';
import PeopleIcon from '@mui/icons-material/People';
import SendIcon from '@mui/icons-material/Send';
import EventNoteIcon from '@mui/icons-material/EventNote';
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

type Picker = { name: string; image: string | null; email: string };
type Picks = Record<number, Record<string, Picker[]>>;

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

function PicksSection({ fixture, picksForMatch }: { fixture: Fixture; picksForMatch: Record<string, Picker[]> }) {
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

// ─── Match Row ────────────────────────────────────────────────────────────────

interface MatchRowProps {
  fixture: Fixture;
  label: React.ReactNode;
  isPastDeadline: boolean;
  commentsOpen: boolean;
  picksOpen: boolean;
  comments: Comment[];
  picksForMatch: Record<string, Picker[]>;
  leagueId: string;
  onToggleComments: () => void;
  onTogglePicks: () => void;
  onNewComment: (c: Comment) => void;
}

function MatchRow({
  fixture,
  label,
  isPastDeadline,
  commentsOpen,
  picksOpen,
  comments,
  picksForMatch,
  leagueId,
  onToggleComments,
  onTogglePicks,
  onNewComment,
}: MatchRowProps) {
  const totalPicks = Object.values(picksForMatch).reduce((s, a) => s + a.length, 0);
  const isAnyOpen = commentsOpen || picksOpen;
  const rowRef = useRef<HTMLDivElement>(null);

  // When a panel opens, wait for Collapse animation then scroll the row to a sensible position
  useEffect(() => {
    if (commentsOpen || picksOpen) {
      setTimeout(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 280);
    }
  }, [commentsOpen, picksOpen]);

  return (
    <Box ref={rowRef} sx={{ borderBottom: isAnyOpen ? 'none' : '1px solid', borderColor: isAnyOpen ? 'transparent' : 'divider' }}>
      {/* Fixture row */}
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
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52, flexShrink: 0 }}>
          {new Date(fixture.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap>{label}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
          {fixture.city}
        </Typography>

        {/* Picks toggle — only after deadline */}
        {isPastDeadline && (
          <Box
            onClick={onTogglePicks}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              cursor: 'pointer',
              flexShrink: 0,
              color: picksOpen ? 'secondary.main' : 'text.disabled',
              px: 0.75,
              py: 0.5,
              borderRadius: 1,
              '&:hover': { color: 'secondary.main', bgcolor: 'action.hover' },
              transition: 'color 0.15s',
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
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            cursor: 'pointer',
            flexShrink: 0,
            color: commentsOpen ? 'primary.main' : 'text.disabled',
            px: 0.75,
            py: 0.5,
            borderRadius: 1,
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            transition: 'color 0.15s',
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
          <PicksSection fixture={fixture} picksForMatch={picksForMatch} />
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [picks, setPicks] = useState<Picks>({});
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [openPicks, setOpenPicks] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
      if (!leagueRes.ok) return;
      const { id } = await leagueRes.json();
      setLeagueId(id);

      const [cRes, pRes] = await Promise.all([
        fetch(`/api/match-comments?leagueId=${id}`),
        fetch(`/api/match-picks?leagueId=${id}`),
      ]);
      if (cRes.ok) setComments((await cRes.json()).comments);
      if (pRes.ok) setPicks((await pRes.json()).picks);
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

  function renderMatchRow(fixture: Fixture) {
    const deadline = isPhasePastDeadline(fixture.phase);
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
        isPastDeadline={deadline}
        commentsOpen={openComments.has(fixture.matchNumber)}
        picksOpen={openPicks.has(fixture.matchNumber)}
        comments={commentsFor(fixture.matchNumber)}
        picksForMatch={picks[fixture.matchNumber] ?? {}}
        leagueId={leagueId}
        onToggleComments={() => toggleComments(fixture.matchNumber)}
        onTogglePicks={() => togglePicks(fixture.matchNumber)}
        onNewComment={addComment}
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
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Group Stage — 72 Matches
        </Typography>

        {GROUPS.map((group) => {
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
                        sx={{ fontSize: '0.65rem', height: 18, background: `${t.primaryColor}22`, color: '#fff' }}
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
        })}

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
    </Box>
  );
}
