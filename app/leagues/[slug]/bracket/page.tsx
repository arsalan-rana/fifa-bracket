'use client';

import { useState, useEffect, use } from 'react';
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

function MatchCard({
  fixture,
  selected,
  onSelect,
  disabled,
  chipActive,
}: {
  fixture: Fixture;
  selected?: string;
  onSelect: (winner: string) => void;
  disabled: boolean;
  chipActive?: string; // chip type applied to this match
}) {
  const team1 = TEAMS[fixture.team1];
  const team2 = TEAMS[fixture.team2];
  const matchDate = new Date(fixture.date);

  const opts = [
    { code: fixture.team1, label: team1?.name ?? fixture.team1, flag: team1?.flag ?? '' },
    ...(fixture.canDraw ? [{ code: 'DRAW', label: 'Draw', flag: '🤝' }] : []),
    { code: fixture.team2, label: team2?.name ?? fixture.team2, flag: team2?.flag ?? '' },
  ];

  return (
    <Card sx={{ mb: 1.5, background: selected ? 'rgba(0,61,165,0.12)' : '#111827', border: selected ? '1px solid rgba(0,61,165,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Match {fixture.matchNumber} · {fixture.city} · {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Typography>
          {chipActive && (
            <Chip
              label={chipActive === 'doubleUp' ? '2x' : chipActive === 'banker' ? '3x Banker' : chipActive}
              size="small"
              className={chipActive === 'doubleUp' ? 'chip-doubleup' : chipActive === 'banker' ? 'chip-banker' : 'chip-wildcard'}
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {opts.map((opt) => (
            <Button
              key={opt.code}
              variant={selected === opt.code ? 'contained' : 'outlined'}
              color={selected === opt.code ? 'primary' : 'inherit'}
              size="small"
              onClick={() => !disabled && onSelect(opt.code)}
              disabled={disabled}
              sx={{
                flex: 1,
                minWidth: 80,
                fontWeight: selected === opt.code ? 700 : 400,
                borderRadius: 2,
                fontSize: '0.8rem',
                py: 0.75,
                background: selected === opt.code ? undefined : 'transparent',
                borderColor: selected === opt.code ? undefined : 'rgba(255,255,255,0.12)',
              }}
            >
              {opt.flag} {opt.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BracketPage({ params }: Props) {
  const { slug } = use(params);

  const [predictions, setPredictions] = useState<Predictions>({});
  const [chips, setChips] = useState<Record<string, { matchNumber: number; chipType: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leagueId, setLeagueId] = useState('');
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [expanded, setExpanded] = useState<string>('group-A');

  const currentPhase = getCurrentPhase();
  const phaseConfig = PHASES.find((p) => p.id === currentPhase)!;
  const isPastDeadline = isPhasePastDeadline(currentPhase);

  useEffect(() => {
    async function load() {
      try {
        // Get league ID from slug
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);

        // Get existing predictions
        const predRes = await fetch(`/api/get-predictions?leagueId=${leagueData.id}`);
        if (predRes.ok) {
          const data = await predRes.json();
          const predMap: Predictions = {};
          for (const p of data.predictions) predMap[p.matchNumber] = p.predictedWinner;
          setPredictions(predMap);
          const chipMap: Record<string, { matchNumber: number; chipType: string }> = {};
          for (const c of data.chips) chipMap[c.phase] = { matchNumber: c.matchNumber, chipType: c.chipType };
          setChips(chipMap);
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
    <Box sx={{ background: '#0A0F1E', minHeight: '100vh', py: 4 }}>
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

          {isPastDeadline && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              The deadline has passed. Submissions will be marked as late and may incur a penalty.
            </Alert>
          )}
        </Box>

        {/* Save all button */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleSubmit('group')}
            disabled={submitting || completedGroupMatches === 0}
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
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 2,
                mb: 1.5,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Typography sx={{ fontWeight: 800, minWidth: 80 }}>
                    Group {group}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', flexGrow: 1 }}>
                    {teams.map((t) => t && (
                      <Chip
                        key={t.code}
                        label={`${t.flag} ${t.code}`}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: 20, background: `${t.primaryColor}22`, color: '#fff' }}
                      />
                    ))}
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
            disabled={submitting || completedGroupMatches === 0}
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
