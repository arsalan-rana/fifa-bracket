'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import {
  GROUPS,
  GROUP_FIXTURES,
  TEAMS,
  PHASES,
  getCurrentPhase,
  isPhasePastDeadline,
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
}: {
  fixture: Fixture;
  selected?: string;
  onSelect: (winner: string) => void;
  disabled: boolean;
  chipActive?: string; // chip type applied to this match
  chipMode: ChipType | null;
  onApplyChip?: (matchNumber: number) => void;
  pickCounts?: Record<string, number>;
  totalMembers?: number;
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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {opts.map((opt) => {
            const count = pickCounts?.[opt.code] ?? 0;
            const pct = totalMembers && totalMembers > 0 && count > 0
              ? Math.round((count / totalMembers) * 100)
              : 0;
            return (
              <Box key={opt.code} sx={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                {pct > 0 && (
                  <Box>
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
  onRemoveChip: (chipType: ChipType) => void;
}

function ChipsPanel({ phase, chips, chipMode, onSelectChipMode, onRemoveChip }: ChipsPanelProps) {
  const phaseConfig = PHASES.find((p) => p.id === phase)!;
  const availableChips = phaseConfig.chipsAvailable as ChipType[];

  if (availableChips.length === 0) return null;

  function getChipUsage(chipType: ChipType): ChipUsage | undefined {
    return chips[`${phase}:${chipType}`];
  }

  function getMatchLabel(matchNumber: number): string {
    const fixture = GROUP_FIXTURES.find((f) => f.matchNumber === matchNumber);
    if (!fixture) return `Match ${matchNumber}`;
    const t1 = TEAMS[fixture.team1];
    const t2 = TEAMS[fixture.team2];
    return `Match ${matchNumber}: ${t1?.flag ?? ''} ${t1?.code ?? fixture.team1} vs ${t2?.flag ?? ''} ${t2?.code ?? fixture.team2}`;
  }

  function canRemoveChip(chipType: ChipType): boolean {
    const usage = getChipUsage(chipType);
    if (!usage) return false;
    const fixture = GROUP_FIXTURES.find((f) => f.matchNumber === usage.matchNumber);
    if (!fixture) return false;
    return !matchHasStarted(fixture);
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
          const removable = canRemoveChip(type);

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
                    label="Used"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
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
                <Box>
                  <Typography variant="caption" sx={{ color: '#C9A73A', display: 'block', mb: 0.5 }}>
                    {getMatchLabel(usage.matchNumber)}
                  </Typography>
                  {removable && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => onRemoveChip(type)}
                      sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minHeight: 0 }}
                    >
                      Change
                    </Button>
                  )}
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
  const [chips, setChips] = useState<ChipsState>({});
  const [chipMode, setChipMode] = useState<ChipType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [chipSubmitting, setChipSubmitting] = useState(false);
  const [leagueId, setLeagueId] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [expanded, setExpanded] = useState<string>('group-A');
  const [leaguePicks, setLeaguePicks] = useState<Record<number, Record<string, number>>>({});
  const [leagueMemberCount, setLeagueMemberCount] = useState(1);

  const currentPhase = getCurrentPhase();
  const phaseConfig = PHASES.find((p) => p.id === currentPhase)!;
  const isPastDeadline = isPhasePastDeadline(currentPhase);

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

        // Get existing predictions
        const predRes = await fetch(`/api/get-predictions?leagueId=${leagueData.id}`);
        if (predRes.ok) {
          const data = await predRes.json();
          const predMap: Predictions = {};
          for (const p of data.predictions) predMap[p.matchNumber] = p.predictedWinner;
          setPredictions(predMap);

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

        // Fetch league-wide pick counts for this phase
        const picksRes = await fetch(`/api/league-picks?leagueId=${leagueData.id}&phase=${currentPhase}`);
        if (picksRes.ok) {
          const picksData = await picksRes.json();
          setLeaguePicks(picksData.picks ?? {});
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  function setPrediction(matchNumber: number, winner: string) {
    setPredictions((prev) => ({ ...prev, [matchNumber]: winner }));
  }

  function getGroupFixtures(group: string): Fixture[] {
    return GROUP_FIXTURES.filter((f) => f.group === group);
  }

  function groupCompletionCount(group: string): number {
    return getGroupFixtures(group).filter((f) => predictions[f.matchNumber]).length;
  }

  /** Returns the chipType applied to a given match in the current phase, if any */
  function getChipForMatch(matchNumber: number): string | undefined {
    for (const key of Object.keys(chips)) {
      const usage = chips[key];
      if (usage.phase === currentPhase && usage.matchNumber === matchNumber) {
        return usage.chipType;
      }
    }
    return undefined;
  }

  const handleApplyChip = useCallback(
    async (matchNumber: number) => {
      if (!chipMode || !leagueId || chipSubmitting) return;
      setChipSubmitting(true);
      try {
        const res = await fetch('/api/submit-chips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueId, phase: currentPhase, chipType: chipMode, matchNumber }),
        });
        const data = await res.json();
        if (res.ok) {
          setChips((prev) => ({
            ...prev,
            [`${currentPhase}:${chipMode}`]: { matchNumber, chipType: chipMode, phase: currentPhase },
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
    },
    [chipMode, leagueId, currentPhase, chipSubmitting],
  );

  function handleRemoveChip(chipType: ChipType) {
    // Enter chip mode for re-placement (remove from local state, let user pick new match)
    setChips((prev) => {
      const next = { ...prev };
      delete next[`${currentPhase}:${chipType}`];
      return next;
    });
    setChipMode(chipType);
  }

  function handleAutoPick() {
    const phaseFixtures = GROUP_FIXTURES.filter((f) => f.phase === currentPhase);
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

  async function handleSubmit(phase: Phase) {
    if (!leagueId) return;
    setSubmitting(true);

    const phaseFixtures = GROUP_FIXTURES.filter((f) => f.phase === phase);
    const phasePredictions = phaseFixtures
      .filter((f) => predictions[f.matchNumber])
      .map((f) => ({ matchNumber: f.matchNumber, predictedWinner: predictions[f.matchNumber] }));

    if (phasePredictions.length === 0) {
      setSnack({ msg: 'No predictions to submit', severity: 'error' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/submit-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, phase, predictions: phasePredictions }),
      });
      const data = await res.json();
      if (res.ok) {
        setSnack({ msg: `${data.count} picks saved!${data.isLate ? ' (late)' : ''}`, severity: 'success' });
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

  const totalGroupMatches = GROUP_FIXTURES.length;
  const completedGroupMatches = GROUP_FIXTURES.filter((f) => predictions[f.matchNumber]).length;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
            <SportsSoccerIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
            Submit Your Picks
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <Chip
              label={`${phaseConfig.icon} ${phaseConfig.name} Active`}
              sx={{ background: `${phaseConfig.color}22`, color: phaseConfig.color, fontWeight: 700 }}
            />
            {isPastDeadline ? (
              <Chip label="⏰ Deadline passed — late submissions" color="warning" />
            ) : (
              <Chip
                label={`⏳ Deadline: ${new Date(phaseConfig.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                color="success"
                variant="outlined"
              />
            )}
          </Box>

          {/* Progress */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Group stage progress:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }} color="secondary.main">
              {completedGroupMatches}/{totalGroupMatches}
            </Typography>
          </Box>

          {/* AI Autopick */}
          {!isPastDeadline && isVerified && GROUP_FIXTURES.filter((f) => f.phase === currentPhase && !predictions[f.matchNumber] && f.aiPrediction).length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleAutoPick}
                sx={{ fontWeight: 700, borderRadius: 2, fontSize: '0.8rem' }}
              >
                ✨ Fill with AI Picks
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Review and save when ready.
              </Typography>
            </Box>
          )}

          {isPastDeadline && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              The deadline has passed. Submissions will be marked as late and may incur a penalty.
            </Alert>
          )}

          {!isVerified && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              Your buy-in payment is pending verification. You cannot submit picks until the league owner verifies your payment.
            </Alert>
          )}
        </Box>

        {/* Chips Panel — shown only when phase has chips */}
        {phaseConfig.chipsAvailable.length > 0 && (
          <ChipsPanel
            phase={currentPhase}
            chips={chips}
            chipMode={chipMode}
            onSelectChipMode={setChipMode}
            onRemoveChip={handleRemoveChip}
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

        {/* Save all button */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleSubmit('group')}
            disabled={submitting || completedGroupMatches === 0 || !isVerified}
            title={!isVerified ? 'Your buy-in payment is pending verification' : undefined}
            sx={{ px: 4 }}
          >
            {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Save All Group Stage Picks ({completedGroupMatches})
          </Button>
        </Box>

        {/* Groups */}
        {GROUPS.map((group) => {
          const fixtures = getGroupFixtures(group);
          const done = groupCompletionCount(group);
          const teams = [...new Set(fixtures.flatMap((f) => [f.team1, f.team2]))].map((c) => TEAMS[c]);

          return (
            <Accordion
              key={group}
              expanded={expanded === `group-${group}`}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? `group-${group}` : '')}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                mb: 1.5,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Typography sx={{ fontWeight: 800, minWidth: 80 }}>Group {group}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flexGrow: 1 }}>
                    {teams.map(
                      (t) =>
                        t && (
                          <Chip
                            key={t.code}
                            label={`${t.flag} ${t.code}`}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: 20, background: `${t.primaryColor}33`, color: 'text.primary' }}
                          />
                        ),
                    )}
                  </Box>
                  <Chip
                    label={`${done}/${fixtures.length}`}
                    size="small"
                    color={done === fixtures.length ? 'success' : done > 0 ? 'warning' : 'default'}
                    sx={{ minWidth: 50, fontWeight: 700 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {fixtures.map((fixture) => (
                  <MatchCard
                    key={fixture.matchNumber}
                    fixture={fixture}
                    selected={predictions[fixture.matchNumber]}
                    onSelect={(winner) => setPrediction(fixture.matchNumber, winner)}
                    disabled={false}
                    chipActive={getChipForMatch(fixture.matchNumber)}
                    chipMode={chipMode}
                    onApplyChip={handleApplyChip}
                    pickCounts={leaguePicks[fixture.matchNumber]}
                    totalMembers={leagueMemberCount}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}

        {/* Bottom save */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleSubmit('group')}
            disabled={submitting || completedGroupMatches === 0 || !isVerified}
            title={!isVerified ? 'Your buy-in payment is pending verification' : undefined}
            sx={{ px: 6, py: 1.5 }}
          >
            {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '✅ '}
            Save All Picks
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            You can come back and update until the deadline
          </Typography>
        </Box>
      </Container>

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
