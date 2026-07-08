'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Skeleton from '@mui/material/Skeleton';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import { TEAMS, GROUP_FIXTURES, KNOCKOUT_FIXTURES, PHASES } from '../../data/fifa-2026';
import { getTeamProfile, type Player } from '../../data/team-profiles';

const PHASE_TAG: Record<string, { label: string; color: string }> = {
  group: { label: 'GS', color: PHASES.find((p) => p.id === 'group')?.color ?? '#003DA5' },
  round32: { label: 'R32', color: PHASES.find((p) => p.id === 'round32')?.color ?? '#6366F1' },
  round16: { label: 'R16', color: PHASES.find((p) => p.id === 'round16')?.color ?? '#8B5CF6' },
  quarter: { label: 'QF', color: PHASES.find((p) => p.id === 'quarter')?.color ?? '#EC4899' },
  semi: { label: 'SF', color: PHASES.find((p) => p.id === 'semi')?.color ?? '#F59E0B' },
  final: { label: 'F', color: PHASES.find((p) => p.id === 'final')?.color ?? '#C9A73A' },
};

const POS_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;
const POS_LABELS: Record<string, string> = { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' };
const POS_COLORS: Record<string, string> = {
  GK: '#F59E0B',
  DEF: '#3B82F6',
  MID: '#10B981',
  FWD: '#EF4444',
};

function SquadRow({ player }: { player: Player }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6 }}>
      <Chip
        label={POS_LABELS[player.pos]}
        size="small"
        sx={{
          height: 18,
          fontSize: '0.6rem',
          fontWeight: 700,
          minWidth: 32,
          bgcolor: `${POS_COLORS[player.pos]}22`,
          color: POS_COLORS[player.pos],
          flexShrink: 0,
        }}
      />
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>
        {player.name}
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right', fontSize: '0.72rem', flexShrink: 0 }}>
        {player.club}
      </Typography>
    </Box>
  );
}

type FixtureResult = { result: string; goals1: number | null; goals2: number | null };

function GroupMatchRow({
  teamCode,
  matchNumber,
  phase,
  team1,
  team2,
  date,
  result,
}: {
  teamCode: string;
  matchNumber: number;
  phase: string;
  team1: string;
  team2: string;
  date: string;
  result?: FixtureResult;
}) {
  const isTeam1 = team1 === teamCode;
  const opponentCode = isTeam1 ? team2 : team1;
  const opponent = TEAMS[opponentCode];
  const dateObj = new Date(date);
  const isPast = dateObj < new Date();

  let outcome: 'W' | 'D' | 'L' | null = null;
  let score: string | null = null;

  if (result) {
    const { goals1, goals2 } = result;
    if (goals1 !== null && goals2 !== null) {
      score = isTeam1 ? `${goals1} – ${goals2}` : `${goals2} – ${goals1}`;
    }
    if (result.result === 'DRAW') {
      outcome = 'D';
    } else if (result.result === teamCode) {
      outcome = 'W';
    } else {
      outcome = 'L';
    }
  }

  const outcomeColors = {
    W: { bg: '#16a34a22', border: '#16a34a', text: '#16a34a', label: 'W' },
    D: { bg: '#d9770622', border: '#d97706', text: '#d97706', label: 'D' },
    L: { bg: '#dc262622', border: '#dc2626', text: '#dc2626', label: 'L' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
      }}
    >
      {/* Phase tag + match number */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, minWidth: 30, flexShrink: 0 }}>
        <Chip
          label={PHASE_TAG[phase]?.label ?? phase}
          size="small"
          sx={{
            height: 15,
            fontSize: '0.55rem',
            fontWeight: 800,
            px: 0.25,
            bgcolor: `${PHASE_TAG[phase]?.color ?? '#666'}22`,
            color: PHASE_TAG[phase]?.color ?? '#666',
            '& .MuiChip-label': { px: 0.6 },
          }}
        />
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', textAlign: 'center' }}>
          M{matchNumber}
        </Typography>
      </Box>

      {/* Opponent */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{opponent?.flag ?? '🏴'}</Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2 }}>
            {opponent?.name ?? opponentCode}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Typography>
        </Box>
      </Box>

      {/* Score / upcoming */}
      {result && score !== null ? (
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: 1, minWidth: 48, textAlign: 'center' }}>
          {score}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', minWidth: 48, textAlign: 'center' }}>
          {isPast ? 'TBD' : dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
        </Typography>
      )}

      {/* Outcome badge */}
      {outcome ? (
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: outcomeColors[outcome].bg,
            border: `1.5px solid ${outcomeColors[outcome].border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: outcomeColors[outcome].text }}>
            {outcomeColors[outcome].label}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ width: 24, height: 24, flexShrink: 0 }} />
      )}
    </Box>
  );
}

interface Props {
  teamCode: string | null;
  onClose: () => void;
}

export default function TeamInfoDrawer({ teamCode, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [results, setResults] = useState<Record<number, FixtureResult>>({});
  const [loadingResults, setLoadingResults] = useState(false);

  const team = teamCode ? TEAMS[teamCode] : null;
  const profile = teamCode ? getTeamProfile(teamCode) : null;

  const teamMatches = teamCode
    ? GROUP_FIXTURES.filter((f) => f.team1 === teamCode || f.team2 === teamCode)
    : [];

  const knockoutMatches = teamCode
    ? KNOCKOUT_FIXTURES.filter((f) => f.team1 === teamCode || f.team2 === teamCode)
    : [];

  const allTeamMatches = [...teamMatches, ...knockoutMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  useEffect(() => {
    if (!teamCode) return;
    setTab(0);
    setLoadingResults(true);
    fetch('/api/fixture-results')
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? {}))
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [teamCode]);

  if (!team || !profile) return null;

  const accentColor = team.primaryColor;

  // Compute group stage summary
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  for (const f of teamMatches) {
    const r = results[f.matchNumber];
    if (!r) continue;
    const isTeam1 = f.team1 === teamCode;
    if (r.result === 'DRAW') {
      draws++;
    } else if (r.result === teamCode) {
      wins++;
    } else {
      losses++;
    }
    if (r.goals1 !== null && r.goals2 !== null) {
      goalsFor += isTeam1 ? r.goals1 : r.goals2;
      goalsAgainst += isTeam1 ? r.goals2 : r.goals1;
    }
  }
  const played = wins + draws + losses;
  const points = wins * 3 + draws;

  return (
    <Dialog
      open={!!teamCode}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            mx: 2,
          },
        },
      }}
    >
      {/* Colour accent header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${accentColor}dd 0%, ${accentColor}99 100%)`,
          px: 3,
          pt: 3,
          pb: 2.5,
          position: 'relative',
        }}
      >
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 1 }}>{team.flag}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1, mb: 1.5 }}>
          {team.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`FIFA #${profile.fifaRanking}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.75rem' }}
          />
          <Chip
            label={team.confederation}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}
          />
        </Box>
      </Box>

      {/* Stats row */}
      <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1, px: 2.5, py: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem', fontWeight: 700 }}>Manager</Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{profile.manager}</Typography>
        </Box>
        <Box sx={{ flex: 1, px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
            <EmojiEventsIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem', fontWeight: 700 }}>Best Result</Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{profile.bestResult}</Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, fontSize: '0.75rem', fontWeight: 700, textTransform: 'none', letterSpacing: 0.3 },
        }}
      >
        <Tab label="Matches" />
        <Tab label="Squad" />
      </Tabs>

      <DialogContent sx={{ p: 0 }}>
        {/* --- GROUP STAGE TAB --- */}
        {tab === 0 && (
          <Box>
            {/* Description */}
            <Box sx={{ px: 2.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontStyle: 'italic', fontSize: '0.8rem' }}>
                {profile.description}
              </Typography>
            </Box>

            {/* Matches */}
            {loadingResults ? (
              <Box sx={{ px: 2.5, py: 2 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
                ))}
              </Box>
            ) : (
              <Box>
                {allTeamMatches.map((f) => (
                  <GroupMatchRow
                    key={f.matchNumber}
                    teamCode={teamCode!}
                    matchNumber={f.matchNumber}
                    phase={f.phase}
                    team1={f.team1}
                    team2={f.team2}
                    date={f.date}
                    result={results[f.matchNumber]}
                  />
                ))}
              </Box>
            )}

            {/* Summary row — only show when there are results */}
            {played > 0 && (
              <Box
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ display: 'block', px: 2, pt: 1, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Group stage record
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    px: 2,
                    py: 1,
                  }}
                >
                {[
                  { label: 'P', value: played },
                  { label: 'W', value: wins, color: '#16a34a' },
                  { label: 'D', value: draws, color: '#d97706' },
                  { label: 'L', value: losses, color: '#dc2626' },
                  { label: 'GF', value: goalsFor },
                  { label: 'GA', value: goalsAgainst },
                  { label: 'Pts', value: points, bold: true },
                ].map(({ label, value, color, bold }) => (
                  <Box key={label} sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600, color: color ?? 'text.primary', fontSize: '0.85rem' }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* --- SQUAD TAB --- */}
        {tab === 1 && (
          <Box sx={{ px: 2.5, pt: 1.5, pb: 2, maxHeight: { xs: '50vh', sm: '55vh' }, overflowY: 'auto' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem', display: 'block', mb: 1 }}>
              Squad · {profile.squad.length} players
            </Typography>
            {POS_ORDER.map((pos) => {
              const players = profile.squad.filter((p) => p.pos === pos);
              if (players.length === 0) return null;
              return (
                <Box key={pos} sx={{ mb: 1 }}>
                  {players.map((p, i) => (
                    <Box key={p.name}>
                      <SquadRow player={p} />
                      {i < players.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
                    </Box>
                  ))}
                  {pos !== 'FWD' && <Divider sx={{ mt: 1, mb: 0.5, borderStyle: 'dashed' }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
