'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TeamInfoDrawer from '../../../components/TeamInfoDrawer';
import {
  GROUPS,
  GROUP_FIXTURES,
  ALL_FIXTURES,
  TEAMS,
  PHASES,
  getCurrentPhase,
  isPhasePastDeadline,
  getFixturesByPhase,
  type Fixture,
  type Phase,
} from '../../../../data/fifa-2026';

interface Props {
  params: Promise<{ slug: string }>;
}

type Predictions = Record<number, string>; // matchNumber → winner code
type ChipType = 'doubleUp' | 'wildcard';

interface ChipUsage {
  matchNumber: number;
  chipType: string;
  phase: string;
}

// Keyed by `${phase}:${chipType}` → ChipUsage
type ChipsState = Record<string, ChipUsage>;

function matchHasStarted(fixture: Fixture): boolean {
  return new Date(fixture.date) <= new Date();
}

function MatchCard({
  fixture,
  selected,
  onSelect,
  disabled,
  chipActive,
  chipMode,
  onApplyChip,
  pickCounts,
  totalMembers,
  onOpenTeamInfo,
}: {
  fixture: Fixture;
  selected?: string;
  onSelect: (winner: string) => void;
  disabled: boolean;
  chipActive?: string;
  chipMode: ChipType | null;
  onApplyChip?: (matchNumber: number) => void;
  pickCounts?: Record<string, number>;
  totalMembers?: number;
  onOpenTeamInfo?: (code: string) => void;
}) {
  const team1 = TEAMS[fixture.team1];
  const team2 = TEAMS[fixture.team2];
  const matchDate = new Date(fixture.date);
  const started = matchHasStarted(fixture);

  const canPlaceChip = chipMode !== null && !started;

  const opts = [
    { code: fixture.team1, label: team1?.name ?? fixture.team1, flag: team1?.flag ?? '' },
    ...(fixture.canDraw ? [{ code: 'DRAW', label: 'Draw', flag: '🤝' }] : []),
    { code: fixture.team2, label: team2?.name ?? fixture.team2, flag: team2?.flag ?? '' },
  ];

  return (
    <Card
      sx={{
        mb: 1.5,
        bgcolor: selected ? 'rgba(0,61,165,0.08)' : 'background.paper',
        border: canPlaceChip
          ? '2px dashed rgba(201,167,58,0.7)'
          : selected
          ? '1px solid rgba(0,61,165,0.4)'
          : '1px solid',
        borderColor: canPlaceChip ? undefined : selected ? undefined : 'divider',
        position: 'relative',
        transition: 'border 0.2s',
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Match {fixture.matchNumber} · {fixture.city} ·{' '}
            {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {started && (
              <Chip
                label="🔒 Started"
                size="small"
                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: 'action.hover', color: 'text.disabled' }}
              />
            )}
            {chipActive && (
              <Chip
                label={chipActive === 'doubleUp' ? '⚡ 2×' : '🃏 Wildcard'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  background: chipActive === 'doubleUp' ? 'rgba(201,167,58,0.25)' : 'rgba(139,92,246,0.25)',
                  color: chipActive === 'doubleUp' ? '#C9A73A' : '#A78BFA',
                  border: `1px solid ${chipActive === 'doubleUp' ? '#C9A73A' : '#A78BFA'}`,
                }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {opts.map((opt) => {
            const count = pickCounts?.[opt.code] ?? 0;
            const pct = totalMembers && totalMembers > 0 && count > 0
              ? Math.round((count / totalMembers) * 100)
              : 0;
            const isRealTeam = opt.code !== 'DRAW' && !!TEAMS[opt.code];
            return (
              <Box key={opt.code} sx={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <Button
                  variant={selected === opt.code ? 'contained' : 'outlined'}
                  color={selected === opt.code ? 'primary' : 'inherit'}
                  size="small"
                  onClick={() => !disabled && !chipMode && onSelect(opt.code)}
                  disabled={disabled || !!chipMode}
                  sx={{
                    width: '100%',
                    fontWeight: selected === opt.code ? 700 : 400,
                    borderRadius: 2,
                    fontSize: '0.8rem',
                    py: 0.75,
                    background: selected === opt.code ? undefined : 'transparent',
                    borderColor: selected === opt.code ? undefined : 'divider',
                  }}
                >
                  {opt.flag} {opt.label}
                </Button>
                {isRealTeam && onOpenTeamInfo && (() => {
                  const teamColor = TEAMS[opt.code]?.primaryColor ?? '#6366f1';
                  return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.25 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onOpenTeamInfo(opt.code); }}
                        sx={{
                          p: { xs: 0.75, sm: 0.5 },
                          bgcolor: `${teamColor}18`,
                          border: `1px solid ${teamColor}35`,
                          borderRadius: '50%',
                          color: teamColor,
                          '&:hover': { bgcolor: `${teamColor}30`, borderColor: `${teamColor}70` },
                          transition: 'all 0.15s',
                        }}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: { xs: 13, sm: 12 } }} />
                      </IconButton>
                    </Box>
                  );
                })()}
                {pct > 0 && (
                  <Box sx={{ mt: isRealTeam && onOpenTeamInfo ? 0 : 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 2, borderRadius: 1, mb: 0.25 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                      {pct}% of league
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Chip placement overlay */}
        {canPlaceChip && (
          <Box sx={{ mt: 1.5 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => onApplyChip?.(fixture.matchNumber)}
              sx={{
                borderColor: '#C9A73A',
                color: '#C9A73A',
                fontWeight: 700,
                fontSize: '0.75rem',
                py: 0.5,
                '&:hover': { background: 'rgba(201,167,58,0.1)', borderColor: '#C9A73A' },
              }}
            >
              {chipMode === 'doubleUp' ? '⚡ Apply Double Up here' : '🃏 Apply Wildcard here'}
            </Button>
          </Box>
        )}

        {chipMode !== null && started && (
          <Box sx={{ mt: 1, opacity: 0.4 }}>
            <Typography variant="caption" color="text.secondary">
              Match already started — chip unavailable
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chips Panel ──────────────────────────────────────────────────────────────

interface ChipsPanelProps {
  phase: Phase;
  chips: ChipsState;
  chipMode: ChipType | null;
  onSelectChipMode: (mode: ChipType | null) => void;
}

function ChipsPanel({ phase, chips, chipMode, onSelectChipMode }: ChipsPanelProps) {
  const phaseConfig = PHASES.find((p) => p.id === phase)!;
  const availableChips = phaseConfig.chipsAvailable as ChipType[];

  if (availableChips.length === 0) return null;

  function getChipUsage(chipType: ChipType): ChipUsage | undefined {
    return chips[`${phase}:${chipType}`];
  }

  function getMatchLabel(matchNumber: number): string {
    const fixture = ALL_FIXTURES.find((f) => f.matchNumber === matchNumber);
    if (!fixture) return `Match ${matchNumber}`;
    const t1 = TEAMS[fixture.team1];
    const t2 = TEAMS[fixture.team2];
    return `Match ${matchNumber}: ${t1?.flag ?? ''} ${t1?.code ?? fixture.team1} vs ${t2?.flag ?? ''} ${t2?.code ?? fixture.team2}`;
  }

  const chipDefs: { type: ChipType; icon: string; name: string; description: string }[] = [
    { type: 'doubleUp', icon: '⚡', name: 'Double Up', description: 'Apply to 1 match for 2× points' },
    { type: 'wildcard', icon: '🃏', name: 'Wildcard', description: 'Change 1 pick after deadline' },
  ];

  const visibleChips = chipDefs.filter((c) => availableChips.includes(c.type));

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, mb: 1.5, color: '#C9A73A', textTransform: 'uppercase', letterSpacing: 1 }}
      >
        🎰 Power Chips
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {visibleChips.map(({ type, icon, name, description }) => {
          const usage = getChipUsage(type);
          const isUsed = !!usage;
          const isActive = chipMode === type;

          return (
            <Box
              key={type}
              sx={{
                flex: '1 1 200px',
                p: 1.5,
                borderRadius: 2,
                border: isActive ? '2px solid #C9A73A' : '1px solid',
                borderColor: isActive ? undefined : 'divider',
                bgcolor: isActive
                  ? 'rgba(201,167,58,0.1)'
                  : isUsed
                  ? 'action.hover'
                  : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1">{icon}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {name}
                </Typography>
                {isUsed && (
                  <Chip
                    label="🔒 Locked"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      bgcolor: 'rgba(201,167,58,0.2)',
                      color: '#C9A73A',
                      fontWeight: 700,
                    }}
                  />
                )}
                {!isUsed && (
                  <Chip
                    label="Available"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      background: 'rgba(34,197,94,0.15)',
                      color: '#22C55E',
                    }}
                  />
                )}
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {description}
              </Typography>

              {isUsed ? (
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'rgba(201,167,58,0.08)',
                    border: '1px solid rgba(201,167,58,0.3)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.25, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Applied to
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#C9A73A', display: 'block', fontWeight: 700, fontSize: '0.75rem' }}>
                    {getMatchLabel(usage.matchNumber)}
                  </Typography>
                </Box>
              ) : (
                <Button
                  size="small"
                  variant={isActive ? 'contained' : 'outlined'}
                  onClick={() => onSelectChipMode(isActive ? null : type)}
                  sx={{
                    fontSize: '0.7rem',
                    py: 0.5,
                    fontWeight: 700,
                    ...(isActive
                      ? { background: '#C9A73A', color: '#000', '&:hover': { background: '#b8952e' } }
                      : {
                          borderColor: '#C9A73A',
                          color: '#C9A73A',
                          '&:hover': { background: 'rgba(201,167,58,0.1)', borderColor: '#C9A73A' },
                        }),
                  }}
                >
                  {isActive ? '✕ Cancel' : 'Select Match →'}
                </Button>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BracketPage({ params }: Props) {
  const { slug } = use(params);

  const [predictions, setPredictions] = useState<Predictions>({});
  const [savedPredictions, setSavedPredictions] = useState<Predictions>({});
  const [chips, setChips] = useState<ChipsState>({});
  const [chipMode, setChipMode] = useState<ChipType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [chipSubmitting, setChipSubmitting] = useState(false);
  const [leagueId, setLeagueId] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' | 'warning' } | null>(null);
  const [expanded, setExpanded] = useState<string>('group-A');
  const [groupBy, setGroupBy] = useState<'group' | 'date'>('group');
  const [leaguePicks, setLeaguePicks] = useState<Record<number, Record<string, number>>>({});
  const [leagueMemberCount, setLeagueMemberCount] = useState(1);
  const [teamDrawer, setTeamDrawer] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [otherLeagues, setOtherLeagues] = useState<{ id: string; name: string; _count?: { members: number } }[]>([]);
  const [copySourceId, setCopySourceId] = useState('');
  const [copying, setCopying] = useState(false);
  const [chipConfirmFixture, setChipConfirmFixture] = useState<Fixture | null>(null);
  const [wildcardFixture, setWildcardFixture] = useState<Fixture | null>(null);
  const [wildcardNewPick, setWildcardNewPick] = useState<string>('');

  const currentPhase = getCurrentPhase();

  // Default to the previous phase if its last match hasn't had time to complete yet
  // (3h buffer after last kickoff covers 90min + ET + pens + result entry)
  function getDefaultViewPhase(): Phase {
    const phases = PHASES.map((p) => p.id as Phase);
    const idx = phases.indexOf(currentPhase);
    if (idx > 0) {
      const prev = phases[idx - 1];
      const prevFixtures = ALL_FIXTURES.filter(
        (f) => f.phase === prev && f.team1 !== 'TBD' && f.team2 !== 'TBD'
      );
      if (prevFixtures.length > 0) {
        const lastKickoff = Math.max(...prevFixtures.map((f) => new Date(f.date).getTime()));
        if (lastKickoff + 3 * 3600_000 > Date.now()) return prev;
      }
    }
    return currentPhase;
  }

  const [viewPhase, setViewPhase] = useState<Phase>(getDefaultViewPhase());

  const phaseConfig = PHASES.find((p) => p.id === viewPhase)!;
  const isPastDeadline = isPhasePastDeadline(viewPhase);

  // Which phases have fixtures populated (not all-TBD)
  const availablePhases = PHASES.filter((p) =>
    ALL_FIXTURES.some((f) => f.phase === p.id && f.team1 !== 'TBD')
  );

  // Cancel chip mode when switching phases — prevents group chip bleeding into R32
  useEffect(() => { setChipMode(null); }, [viewPhase]);

  // ESC to cancel chip mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setChipMode(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // Get league ID from slug
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);
        setIsVerified(leagueData.isVerified !== false);
        setLeagueMemberCount(leagueData.memberCount ?? 1);
        setAllowLateSubmission(!!leagueData.allowLateSubmission);

        // Get existing predictions
        const predRes = await fetch(`/api/get-predictions?leagueId=${leagueData.id}`);
        if (predRes.ok) {
          const data = await predRes.json();
          const predMap: Predictions = {};
          for (const p of data.predictions) predMap[p.matchNumber] = p.predictedWinner;
          setPredictions(predMap);
          setSavedPredictions(predMap);

          const chipMap: ChipsState = {};
          for (const c of data.chips) {
            chipMap[`${c.phase}:${c.chipType}`] = {
              matchNumber: c.matchNumber,
              chipType: c.chipType,
              phase: c.phase,
            };
          }
          setChips(chipMap);
        }

      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Re-fetch league pick distribution whenever the viewed phase changes
  useEffect(() => {
    if (!leagueId) return;
    fetch(`/api/league-picks?leagueId=${leagueId}&phase=${viewPhase}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setLeaguePicks(d.picks ?? {}); });
  }, [leagueId, viewPhase]);

  function setPrediction(matchNumber: number, winner: string) {
    setPredictions((prev) => ({ ...prev, [matchNumber]: winner }));
  }

  function getGroupFixtures(group: string): Fixture[] {
    return GROUP_FIXTURES.filter((f) => f.group === group);
  }

  function getMatchesByDate(): { dayLabel: string; fixtures: Fixture[] }[] {
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

  function groupCompletionCount(group: string): number {
    return getGroupFixtures(group).filter((f) => predictions[f.matchNumber]).length;
  }

  /** Returns the chipType applied to a given match in the viewed phase, if any */
  function getChipForMatch(matchNumber: number): string | undefined {
    for (const key of Object.keys(chips)) {
      const usage = chips[key];
      if (usage.phase === viewPhase && usage.matchNumber === matchNumber) {
        return usage.chipType;
      }
    }
    return undefined;
  }

  const handleApplyChip = useCallback(
    (matchNumber: number) => {
      if (!chipMode || !leagueId || chipSubmitting) return;
      const fixture = ALL_FIXTURES.find((f) => f.matchNumber === matchNumber);
      if (!fixture) return;
      // Hard guard: chip must be applied to a match in the currently viewed phase
      if (fixture.phase !== viewPhase) return;
      if (chipMode === 'wildcard') {
        setWildcardFixture(fixture);
        setWildcardNewPick('');
      } else {
        setChipConfirmFixture(fixture);
      }
    },
    [chipMode, leagueId, chipSubmitting, viewPhase],
  );

  const handleApplyWildcard = useCallback(async () => {
    if (!wildcardFixture || !wildcardNewPick || !leagueId || chipSubmitting) return;
    const { matchNumber, phase: fixturePhase } = wildcardFixture;
    const currentPick = savedPredictions[matchNumber] ?? predictions[matchNumber];
    if (wildcardNewPick === currentPick) return;
    setChipSubmitting(true);
    try {
      const chipRes = await fetch('/api/submit-chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, phase: fixturePhase, chipType: 'wildcard', matchNumber }),
      });
      if (!chipRes.ok) {
        const err = await chipRes.json();
        setSnack({ msg: err.error || 'Failed to apply wildcard', severity: 'error' });
        return;
      }
      const predRes = await fetch('/api/submit-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, phase: fixturePhase, predictions: [{ matchNumber, predictedWinner: wildcardNewPick }] }),
      });
      const predData = await predRes.json();
      if (predRes.ok) {
        setChips((prev) => ({
          ...prev,
          [`${fixturePhase}:wildcard`]: { matchNumber, chipType: 'wildcard', phase: fixturePhase },
        }));
        setPredictions((prev) => ({ ...prev, [matchNumber]: wildcardNewPick }));
        setSavedPredictions((prev) => ({ ...prev, [matchNumber]: wildcardNewPick }));
        const teamName = wildcardNewPick === 'DRAW' ? 'Draw' : (TEAMS[wildcardNewPick]?.name ?? wildcardNewPick);
        setSnack({ msg: `🃏 Wildcard applied — ${teamName} saved, no penalty`, severity: 'success' });
        setWildcardFixture(null);
        setWildcardNewPick('');
        setChipMode(null);
      } else {
        setSnack({ msg: predData.error || 'Failed to save pick', severity: 'error' });
      }
    } catch {
      setSnack({ msg: 'Network error', severity: 'error' });
    } finally {
      setChipSubmitting(false);
    }
  }, [wildcardFixture, wildcardNewPick, savedPredictions, predictions, leagueId, chipSubmitting]);

  const handleConfirmChip = useCallback(async () => {
    if (!chipConfirmFixture || !chipMode || !leagueId || chipSubmitting) return;
    const { matchNumber, phase: fixturePhase } = chipConfirmFixture;
    setChipConfirmFixture(null);
    setChipSubmitting(true);
    try {
      const res = await fetch('/api/submit-chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, phase: fixturePhase, chipType: chipMode, matchNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setChips((prev) => ({
          ...prev,
          [`${fixturePhase}:${chipMode}`]: { matchNumber, chipType: chipMode, phase: fixturePhase },
        }));
        setSnack({
          msg:
            chipMode === 'doubleUp'
              ? `⚡ Double Up applied to Match ${matchNumber}!`
              : `🃏 Wildcard applied to Match ${matchNumber}!`,
          severity: 'success',
        });
        setChipMode(null);
      } else {
        setSnack({ msg: data.error || 'Failed to apply chip', severity: 'error' });
      }
    } catch {
      setSnack({ msg: 'Network error', severity: 'error' });
    } finally {
      setChipSubmitting(false);
    }
  }, [chipConfirmFixture, chipMode, leagueId, chipSubmitting]);

  function handleAutoPick() {
    const phaseFixtures = getFixturesByPhase(viewPhase);
    let filled = 0;
    const newPredictions: Predictions = { ...predictions };
    for (const f of phaseFixtures) {
      if (!newPredictions[f.matchNumber] && f.aiPrediction) {
        newPredictions[f.matchNumber] = f.aiPrediction;
        filled++;
      }
    }
    if (filled > 0) {
      setPredictions(newPredictions);
      setSnack({ msg: `✨ Filled ${filled} pick${filled === 1 ? '' : 's'} with AI predictions`, severity: 'success' });
    } else {
      setSnack({ msg: 'No empty picks to fill', severity: 'error' });
    }
  }

  async function handleOpenCopy() {
    const res = await fetch('/api/my-leagues');
    if (!res.ok) return;
    const data = await res.json();
    const others = (data.leagues as { id: string; name: string; isMember?: boolean; _count?: { members: number } }[])
      .filter((l) => l.id !== leagueId && l.isMember !== false);
    setOtherLeagues(others);
    setCopySourceId(others[0]?.id ?? '');
    setCopyOpen(true);
  }

  async function handleCopyPicks() {
    if (!copySourceId || !leagueId) return;
    setCopying(true);
    try {
      const res = await fetch('/api/copy-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromLeagueId: copySourceId, toLeagueId: leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCopyOpen(false);
      // Reload predictions to reflect copied picks
      const predRes = await fetch(`/api/get-predictions?leagueId=${leagueId}`);
      if (predRes.ok) {
        const predData = await predRes.json();
        const predMap: Predictions = {};
        for (const p of predData.predictions) predMap[p.matchNumber] = p.predictedWinner;
        setPredictions(predMap);
      }
      const parts = [];
      if (data.count > 0) parts.push(`${data.count} match pick${data.count === 1 ? '' : 's'}`);
      if (data.bonusCount > 0) parts.push(`${data.bonusCount} bonus answer${data.bonusCount === 1 ? '' : 's'}`);
      const hasAnything = parts.length > 0;
      setSnack({
        msg: hasAnything
          ? `📋 Copied ${parts.join(' + ')}`
          : 'No picks to copy from that league',
        severity: hasAnything ? 'success' : 'error',
      });
    } catch (e: unknown) {
      setSnack({ msg: e instanceof Error ? e.message : 'Failed to copy picks', severity: 'error' });
    } finally {
      setCopying(false);
    }
  }

  async function handleSubmit(phase: Phase) {
    if (!leagueId) return;
    setSubmitting(true);

    const now = new Date();
    const phaseFixtures = getFixturesByPhase(phase);
    // Only submit picks for matches that haven't started — server hard-rejects started matches
    const unstartedPicks = phaseFixtures
      .filter((f) => f.team1 !== 'TBD' && f.team2 !== 'TBD' && predictions[f.matchNumber] && new Date(f.date) > now)
      .map((f) => ({ matchNumber: f.matchNumber, predictedWinner: predictions[f.matchNumber] }));

    // After deadline: only send genuinely new picks OR wildcard-covered matches (which can override on-time picks).
    // The server enforces this too, but filtering client-side avoids a pointless round-trip.
    const phasePredictions = isPastDeadline
      ? unstartedPicks.filter((p) => savedPredictions[p.matchNumber] === undefined || wildcardMatchNums.has(p.matchNumber))
      : unstartedPicks;

    if (phasePredictions.length === 0) {
      const msg = isPastDeadline
        ? 'Nothing new to submit — your remaining picks are either locked or already saved'
        : 'No picks to save — all remaining matches have already started';
      setSnack({ msg, severity: 'error' });
      setSubmitting(false);
      return;
    }

    // Count truly unpicked unstarted matches (no pick in state at all)
    const unstartedTotal = phaseFixtures.filter((f) => new Date(f.date) > now).length;
    const missing = unstartedTotal - phaseFixtures.filter((f) => predictions[f.matchNumber] && new Date(f.date) > now).length;

    try {
      const res = await fetch('/api/submit-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, phase, predictions: phasePredictions }),
      });
      const data = await res.json();
      if (res.ok) {
        // Sync saved snapshot so "unsaved changes" indicator clears
        setSavedPredictions((prev) => {
          const updated = { ...prev };
          for (const p of phasePredictions) updated[p.matchNumber] = p.predictedWinner;
          return updated;
        });
        const wildcardSave = isPastDeadline && hasActiveWildcard && !allowLateSubmission;
        const lateNote = data.isLate && !wildcardSave ? ' · marked late' : '';
        const wildcardNote = wildcardSave ? ' · wildcard used, no penalty' : '';
        const missingNote = missing > 0 ? ` · ${missing} match${missing === 1 ? '' : 'es'} still unpicked` : '';
        setSnack({
          msg: `${data.count} pick${data.count === 1 ? '' : 's'} saved${lateNote}${wildcardNote}${missingNote}`,
          severity: missing > 0 ? 'warning' : 'success',
        });
      } else {
        setSnack({ msg: data.error || 'Failed to save', severity: 'error' });
      }
    } catch {
      setSnack({ msg: 'Network error', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  const viewPhaseFixtures = getFixturesByPhase(viewPhase);
  const totalPhaseMatches = viewPhaseFixtures.length;
  const completedPhaseMatches = viewPhaseFixtures.filter((f) => predictions[f.matchNumber]).length;

  const nowRender = new Date();
  const unstartedFixtures = viewPhaseFixtures.filter((f) => f.team1 !== 'TBD' && f.team2 !== 'TBD' && new Date(f.date) > nowRender);
  const unstartedWithPicks = unstartedFixtures.filter((f) => predictions[f.matchNumber]).length;
  const startedCount = viewPhaseFixtures.filter((f) => new Date(f.date) <= nowRender).length;

  // Wildcard chips active for the viewed phase
  const wildcardMatchNums = new Set(
    Object.values(chips)
      .filter((c) => c.chipType === 'wildcard' && c.phase === viewPhase && c.matchNumber !== null)
      .map((c) => c.matchNumber as number)
  );
  const hasActiveWildcard = wildcardMatchNums.size > 0;

  // True if any unstarted match has a local pick that differs from what's in the DB
  const hasUnsavedChanges = unstartedFixtures.some(
    (f) => predictions[f.matchNumber] !== savedPredictions[f.matchNumber],
  );

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
            <SportsSoccerIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
            Submit Your Picks
          </Typography>

          {/* Phase switcher */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {availablePhases.map((p) => {
              const isView = viewPhase === p.id;
              const isCurrent = p.id === currentPhase;
              const isPast = isPhasePastDeadline(p.id);
              return (
                <Button
                  key={p.id}
                  size="small"
                  variant={isView ? 'contained' : 'outlined'}
                  onClick={() => setViewPhase(p.id as Phase)}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    px: 1.5,
                    ...(isView
                      ? { bgcolor: p.color, '&:hover': { bgcolor: p.color, opacity: 0.9 }, color: '#fff' }
                      : { borderColor: p.color, color: p.color, '&:hover': { bgcolor: `${p.color}11` } }),
                  }}
                >
                  {p.icon} {p.shortName}
                  {isCurrent && !isPast && (
                    <Box component="span" sx={{ ml: 0.5, fontSize: '0.6rem', opacity: 0.8 }}>● OPEN</Box>
                  )}
                  {isPast && (
                    <Box component="span" sx={{ ml: 0.5, fontSize: '0.6rem', opacity: 0.6 }}>🔒</Box>
                  )}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <Chip
              label={isPastDeadline ? `${phaseConfig.icon} ${phaseConfig.name} — Locked` : `${phaseConfig.icon} ${phaseConfig.name} — Open`}
              sx={{ background: `${phaseConfig.color}22`, color: phaseConfig.color, fontWeight: 700 }}
            />
            {isPastDeadline && !allowLateSubmission && hasActiveWildcard ? (
              <Chip label="🃏 Wildcard unlocked" sx={{ bgcolor: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontWeight: 700, border: '1px solid rgba(167,139,250,0.4)' }} />
            ) : isPastDeadline && !allowLateSubmission ? (
              <Chip label="🔒 Locked — deadline passed" color="error" />
            ) : isPastDeadline && allowLateSubmission ? (
              <Chip label="⚠️ Late submission — only upcoming matches" color="warning" />
            ) : (
              <Chip
                label={`⏳ Deadline: ${new Date(phaseConfig.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' })}`}
                color="success"
                variant="outlined"
              />
            )}
          </Box>

          {/* Progress */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">{phaseConfig.name} picks:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }} color="secondary.main">
              {completedPhaseMatches}/{totalPhaseMatches}
            </Typography>
            {startedCount > 0 && (
              <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.8rem' }}>
                · {unstartedWithPicks}/{unstartedFixtures.length} for upcoming matches
                {unstartedWithPicks === unstartedFixtures.length && unstartedFixtures.length > 0 && (
                  <Box component="span" sx={{ ml: 0.5, color: 'success.main', fontWeight: 700 }}>✓ all covered</Box>
                )}
              </Typography>
            )}
            {completedPhaseMatches === totalPhaseMatches && startedCount === 0 && (
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>✓ all submitted</Typography>
            )}
          </Box>

          {/* AI Autopick + Copy Picks — hidden after deadline */}
          {!isPastDeadline && (
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {isVerified && viewPhaseFixtures.filter((f) => !predictions[f.matchNumber] && f.aiPrediction).length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAutoPick}
                  sx={{ fontWeight: 700, borderRadius: 2, fontSize: '0.8rem' }}
                >
                  ✨ Fill with AI Picks
                </Button>
              )}
              {isVerified && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                  onClick={handleOpenCopy}
                  sx={{ fontWeight: 700, borderRadius: 2, fontSize: '0.8rem' }}
                >
                  Copy from another league
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                Review and save when ready.
              </Typography>
            </Box>
          )}

          {isPastDeadline && !allowLateSubmission && hasActiveWildcard && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2, background: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
              🃏 Your wildcard is applied — change the pick on the unlocked match below, then hit Save.
            </Alert>
          )}
          {isPastDeadline && !allowLateSubmission && !hasActiveWildcard && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              🔒 Picks are locked. The deadline has passed and no further changes are accepted.
            </Alert>
          )}
          {isPastDeadline && allowLateSubmission && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              ⚠️ Late submission is open for this league. You can only pick matches that haven't started yet — past matches are locked.
            </Alert>
          )}

          {!isVerified && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              Your buy-in payment is pending verification. You cannot submit picks until the league owner verifies your payment.
            </Alert>
          )}
        </Box>

        {/* Chips Panel — hide for group (done), show for all knockout phases always (wildcard is applied after deadline) */}
        {phaseConfig.chipsAvailable.length > 0 && viewPhase !== 'group' && (
          <ChipsPanel
            phase={viewPhase}
            chips={chips}
            chipMode={chipMode}
            onSelectChipMode={setChipMode}
          />
        )}

        {/* Chip placement banner */}
        {chipMode && (
          <Alert
            severity="info"
            sx={{ mb: 2, borderRadius: 2, background: 'rgba(201,167,58,0.1)', color: '#C9A73A', border: '1px solid rgba(201,167,58,0.4)' }}
            action={
              <Button color="inherit" size="small" onClick={() => setChipMode(null)} sx={{ fontWeight: 700 }}>
                Cancel (ESC)
              </Button>
            }
          >
            🎯 Select a match below to apply your{' '}
            <strong>{chipMode === 'doubleUp' ? '⚡ Double Up' : '🃏 Wildcard'}</strong> chip
            {chipSubmitting && <CircularProgress size={14} sx={{ ml: 1, verticalAlign: 'middle' }} />}
          </Alert>
        )}

        {/* Save button — hidden after deadline unless late submission open or wildcard unlocked */}
        {(!isPastDeadline || allowLateSubmission || hasActiveWildcard) && (
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => handleSubmit(viewPhase)}
              disabled={submitting || unstartedWithPicks === 0 || !isVerified}
              title={!isVerified ? 'Your buy-in payment is pending verification' : undefined}
            >
              {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              Save Picks ({unstartedWithPicks} ready)
            </Button>
            {hasUnsavedChanges && (
              <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                ● Unsaved changes
              </Typography>
            )}
          </Box>
        )}

        {/* Group stage: accordion by group OR by date */}
        {viewPhase === 'group' && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Group Stage</Typography>
              <ToggleButtonGroup value={groupBy} exclusive onChange={(_, v) => { if (v) setGroupBy(v); }} size="small">
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
                const fixtures = getGroupFixtures(group);
                const done = groupCompletionCount(group);
                const teams = [...new Set(fixtures.flatMap((f) => [f.team1, f.team2]))].map((c) => TEAMS[c]);
                return (
                  <Accordion
                    key={group}
                    expanded={expanded === `group-${group}`}
                    onChange={(_, isExpanded) => setExpanded(isExpanded ? `group-${group}` : '')}
                    sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1.5, '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Typography sx={{ fontWeight: 800, minWidth: 80 }}>Group {group}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flexGrow: 1 }}>
                          {teams.map((t) => t && (
                            <Chip key={t.code} label={`${t.flag} ${t.code}`} size="small"
                              sx={{ fontSize: '0.7rem', height: 20, background: `${t.primaryColor}33`, color: 'text.primary' }} />
                          ))}
                        </Box>
                        <Chip label={`${done}/${fixtures.length}`} size="small"
                          color={done === fixtures.length ? 'success' : done > 0 ? 'warning' : 'default'}
                          sx={{ minWidth: 50, fontWeight: 700 }} />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      {fixtures.map((fixture) => (
                        <MatchCard key={fixture.matchNumber} fixture={fixture}
                          selected={predictions[fixture.matchNumber]}
                          onSelect={(winner) => setPrediction(fixture.matchNumber, winner)}
                          disabled={matchHasStarted(fixture) || (isPastDeadline && !allowLateSubmission && !wildcardMatchNums.has(fixture.matchNumber))}
                          chipActive={getChipForMatch(fixture.matchNumber)}
                          chipMode={chipMode} onApplyChip={handleApplyChip}
                          pickCounts={leaguePicks[fixture.matchNumber]}
                          totalMembers={leagueMemberCount} onOpenTeamInfo={setTeamDrawer} />
                      ))}
                    </AccordionDetails>
                  </Accordion>
                );
              })
            ) : (
              getMatchesByDate().map(({ dayLabel, fixtures }) => (
                <Box key={dayLabel} sx={{ mb: 3 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>
                    {dayLabel} · {fixtures.length} match{fixtures.length !== 1 ? 'es' : ''}
                  </Typography>
                  {fixtures.map((fixture) => (
                    <MatchCard key={fixture.matchNumber} fixture={fixture}
                      selected={predictions[fixture.matchNumber]}
                      onSelect={(winner) => setPrediction(fixture.matchNumber, winner)}
                      disabled={matchHasStarted(fixture) || (isPastDeadline && !allowLateSubmission && !wildcardMatchNums.has(fixture.matchNumber))}
                      chipActive={getChipForMatch(fixture.matchNumber)}
                      chipMode={chipMode} onApplyChip={handleApplyChip}
                      pickCounts={leaguePicks[fixture.matchNumber]}
                      totalMembers={leagueMemberCount} onOpenTeamInfo={setTeamDrawer} />
                  ))}
                </Box>
              ))
            )}
          </>
        )}

        {/* Knockout phases: flat date-grouped list */}
        {viewPhase !== 'group' && (() => {
          const sorted = [...viewPhaseFixtures].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const byDay = new Map<string, Fixture[]>();
          for (const f of sorted) {
            const label = new Date(f.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
            if (!byDay.has(label)) byDay.set(label, []);
            byDay.get(label)!.push(f);
          }
          return (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{phaseConfig.name}</Typography>
              {[...byDay.entries()].map(([dayLabel, fixtures]) => (
                <Box key={dayLabel} sx={{ mb: 3 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}>
                    {dayLabel} · {fixtures.length} match{fixtures.length !== 1 ? 'es' : ''}
                  </Typography>
                  {fixtures.map((fixture) => {
                    const isTbd = fixture.team1 === 'TBD' || fixture.team2 === 'TBD';
                    return (
                      <MatchCard key={fixture.matchNumber} fixture={fixture}
                        selected={predictions[fixture.matchNumber]}
                        onSelect={(winner) => setPrediction(fixture.matchNumber, winner)}
                        disabled={isTbd || matchHasStarted(fixture) || (isPastDeadline && !allowLateSubmission && !wildcardMatchNums.has(fixture.matchNumber))}
                        chipActive={getChipForMatch(fixture.matchNumber)}
                        chipMode={isTbd ? null : chipMode}
                        onApplyChip={handleApplyChip}
                        pickCounts={leaguePicks[fixture.matchNumber]}
                        totalMembers={leagueMemberCount} onOpenTeamInfo={setTeamDrawer} />
                    );
                  })}
                </Box>
              ))}
            </Box>
          );
        })()}

        {/* Bottom save */}
        {(!isPastDeadline || allowLateSubmission || hasActiveWildcard) && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => handleSubmit(viewPhase)}
              disabled={submitting || unstartedWithPicks === 0 || !isVerified}
              title={!isVerified ? 'Your buy-in payment is pending verification' : undefined}
              sx={{ px: 6, py: 1.5 }}
            >
              {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '✅ '}
              Save Picks ({unstartedWithPicks} ready)
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {isPastDeadline && hasActiveWildcard && !allowLateSubmission
                ? 'Only your wildcard match will be updated — all other picks are locked'
                : isPastDeadline
                ? 'Picks for started matches are locked'
                : 'You can come back and update until the deadline'}
            </Typography>
          </Box>
        )}
      </Container>

      <TeamInfoDrawer teamCode={teamDrawer} onClose={() => setTeamDrawer(null)} />

      {/* Copy picks dialog */}
      <Dialog open={copyOpen} onClose={() => setCopyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>📋 Copy Picks from Another League</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a league to copy your picks from. Only picks for upcoming matches will be copied — remember to save after.
          </Typography>
          {otherLeagues.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              You&apos;re not in any other leagues.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {otherLeagues.map((l) => (
                <Card
                  key={l.id}
                  variant="outlined"
                  sx={{
                    border: '1px solid',
                    borderColor: copySourceId === l.id ? 'primary.main' : 'divider',
                    bgcolor: copySourceId === l.id ? 'rgba(0,61,165,0.08)' : 'background.paper',
                    transition: 'all 0.15s',
                  }}
                >
                  <CardActionArea onClick={() => setCopySourceId(l.id)} sx={{ px: 2, py: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: copySourceId === l.id ? 700 : 400 }}>
                        {l.name}
                      </Typography>
                      {l._count && (
                        <Typography variant="caption" color="text.secondary">
                          👥 {l._count.members}
                        </Typography>
                      )}
                    </Box>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyOpen(false)} disabled={copying}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCopyPicks}
            disabled={copying || !copySourceId || otherLeagues.length === 0}
          >
            {copying ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Copy Picks
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wildcard pick modal */}
      <Dialog
        open={!!wildcardFixture}
        onClose={() => { setWildcardFixture(null); setWildcardNewPick(''); }}
        maxWidth="xs"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
      >
        {wildcardFixture && (() => {
          const t1 = TEAMS[wildcardFixture.team1];
          const t2 = TEAMS[wildcardFixture.team2];
          const currentPick = savedPredictions[wildcardFixture.matchNumber] ?? predictions[wildcardFixture.matchNumber];
          const opts = [
            { code: wildcardFixture.team1, label: t1?.name ?? wildcardFixture.team1, flag: t1?.flag ?? '🏳️' },
            ...(wildcardFixture.canDraw ? [{ code: 'DRAW', label: 'Draw', flag: '🤝' }] : []),
            { code: wildcardFixture.team2, label: t2?.name ?? wildcardFixture.team2, flag: t2?.flag ?? '🏳️' },
          ];
          const matchDate = new Date(wildcardFixture.date);
          const isChanged = !!wildcardNewPick && wildcardNewPick !== currentPick;
          return (
            <>
              <DialogTitle sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>🃏</Typography>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Wildcard Pick</Typography>
                      <Typography variant="caption" color="text.secondary">
                        M{wildcardFixture.matchNumber} · {wildcardFixture.city} ·{' '}
                        {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => { setWildcardFixture(null); setWildcardNewPick(''); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 1.5 }}>
                {/* Teams */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, py: 2.5, mb: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '2.8rem', lineHeight: 1 }}>{t1?.flag ?? '🏳️'}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>{t1?.name ?? wildcardFixture.team1}</Typography>
                  </Box>
                  <Typography color="text.secondary" sx={{ fontWeight: 700, fontSize: '1rem' }}>vs</Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '2.8rem', lineHeight: 1 }}>{t2?.flag ?? '🏳️'}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>{t2?.name ?? wildcardFixture.team2}</Typography>
                  </Box>
                </Box>

                {/* Pick options */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {opts.map((opt) => {
                    const isCurrent = opt.code === currentPick;
                    const isSelected = opt.code === wildcardNewPick;
                    return (
                      <Button
                        key={opt.code}
                        variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() => setWildcardNewPick(isCurrent ? '' : opt.code)}
                        disabled={isCurrent}
                        sx={{
                          py: 1.5,
                          pl: 2.5,
                          justifyContent: 'flex-start',
                          gap: 1.5,
                          fontSize: '0.95rem',
                          fontWeight: isSelected ? 700 : 500,
                          borderColor: isSelected ? '#7c3aed' : 'divider',
                          bgcolor: isSelected ? '#7c3aed' : 'transparent',
                          color: isSelected ? '#fff' : isCurrent ? 'text.disabled' : 'text.primary',
                          '&:hover': { bgcolor: isSelected ? '#6d28d9' : 'rgba(124,58,237,0.06)', borderColor: '#7c3aed' },
                          '&.Mui-disabled': { color: 'text.disabled', borderColor: 'divider', bgcolor: 'action.hover' },
                        }}
                      >
                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{opt.flag}</span>
                        {opt.label}
                        {isCurrent && (
                          <Chip label="your pick" size="small" sx={{ ml: 'auto', mr: 0.5, height: 20, fontSize: '0.6rem', bgcolor: 'action.selected' }} />
                        )}
                      </Button>
                    );
                  })}
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                  🃏 No late penalty · one wildcard chip per phase
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button
                  onClick={handleApplyWildcard}
                  variant="contained"
                  fullWidth
                  disabled={!isChanged || chipSubmitting}
                  sx={{
                    py: 1.5,
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: 2,
                    bgcolor: '#7c3aed',
                    '&:hover': { bgcolor: '#6d28d9' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                  }}
                >
                  {chipSubmitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '🃏 '}
                  Apply Wildcard
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* doubleUp chip confirmation dialog */}
      <Dialog
        open={!!chipConfirmFixture}
        onClose={() => setChipConfirmFixture(null)}
        maxWidth="xs"
        fullWidth
      >
        {chipConfirmFixture && chipMode && (() => {
          const isDoubleUp = chipMode === 'doubleUp';
          const accentColor = isDoubleUp ? '#C9A73A' : '#7c3aed';
          const t1 = TEAMS[chipConfirmFixture.team1];
          const t2 = TEAMS[chipConfirmFixture.team2];
          const matchDate = new Date(chipConfirmFixture.date);
          return (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ fontSize: '2.2rem', lineHeight: 1 }}>{isDoubleUp ? '⚡' : '🃏'}</Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      Apply {isDoubleUp ? 'Double Up' : 'Wildcard'} Chip?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      This cannot be undone
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 0 }}>
                {/* Match card */}
                <Box
                  sx={{
                    my: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Match {chipConfirmFixture.matchNumber} · {chipConfirmFixture.city} ·{' '}
                    {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{t1?.flag ?? '🏳️'}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {t1?.name ?? chipConfirmFixture.team1}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>vs</Typography>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{t2?.flag ?? '🏳️'}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                        {t2?.name ?? chipConfirmFixture.team2}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {/* Effect description */}
                <Box
                  sx={{
                    p: 2,
                    bgcolor: isDoubleUp ? 'rgba(201,167,58,0.08)' : 'rgba(124,58,237,0.08)',
                    border: `1px solid ${accentColor}40`,
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: accentColor, fontWeight: 700, mb: 0.5 }}>
                    {isDoubleUp ? '⚡ 2× Points' : '🃏 Unlock After Deadline'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isDoubleUp
                      ? 'If your pick wins, you earn double the pool points for this match. You only get one Double Up chip per phase.'
                      : 'This match will be unlocked — change your pick after the deadline with no late penalty. You only get one Wildcard chip per phase.'}
                  </Typography>
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                  onClick={() => setChipConfirmFixture(null)}
                  variant="outlined"
                  color="inherit"
                  sx={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmChip}
                  variant="contained"
                  disabled={chipSubmitting}
                  sx={{
                    flex: 1,
                    bgcolor: accentColor,
                    fontWeight: 700,
                    '&:hover': { bgcolor: isDoubleUp ? '#b8952e' : '#6d28d9' },
                  }}
                >
                  {chipSubmitting ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                  {isDoubleUp ? '⚡ Apply Double Up' : '🃏 Apply Wildcard'}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled">
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
