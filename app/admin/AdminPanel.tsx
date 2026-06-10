'use client';

import { useState, useCallback } from 'react';
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
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavBar from '../components/NavBar';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PeopleIcon from '@mui/icons-material/People';
import {
  GROUPS,
  GROUP_FIXTURES,
  KNOCKOUT_FIXTURES,
  TEAMS,
  PHASES,
  BONUS_QUESTIONS,
  type Fixture,
  type Phase,
} from '../../data/fifa-2026';

export interface StoredResult {
  matchNumber: number;
  result: string;
  goals1: number | null;
  goals2: number | null;
  updatedAt: string;
  updatedBy: string;
}

export interface StoredBonusAnswer {
  questionId: string;
  answer: string;
  updatedAt: string;
  updatedBy: string;
}

interface AdminPanelProps {
  existingResults: StoredResult[];
  existingBonusAnswers: StoredBonusAnswer[];
}

const PHASE_LABELS: Record<Phase, string> = {
  group: 'Group Stage',
  round32: 'Round of 32',
  round16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  final: 'Final',
};

// ─── Inline result form ──────────────────────────────────────────────────────

interface GroupResultFormProps {
  fixture: Fixture;
  existing: StoredResult | undefined;
  onSaved: (result: StoredResult) => void;
}

function GroupResultForm({ fixture, existing, onSaved }: GroupResultFormProps) {
  const t1 = TEAMS[fixture.team1];
  const t2 = TEAMS[fixture.team2];

  const [open, setOpen] = useState(false);
  const [goals1, setGoals1] = useState<string>(existing?.goals1?.toString() ?? '');
  const [goals2, setGoals2] = useState<string>(existing?.goals2?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const g1 = parseInt(goals1, 10);
  const g2 = parseInt(goals2, 10);
  const bothValid = !isNaN(g1) && !isNaN(g2) && g1 >= 0 && g2 >= 0;
  const derivedResult = bothValid ? (g1 > g2 ? fixture.team1 : g2 > g1 ? fixture.team2 : 'DRAW') : null;

  async function handleSave() {
    if (!bothValid || !derivedResult) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/update-fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchNumber: fixture.matchNumber,
          result: derivedResult,
          goals1: g1,
          goals2: g2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSuccess(true);
      setOpen(false);
      onSaved({ ...data.fixtureResult, updatedAt: new Date(data.fixtureResult.updatedAt).toISOString() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 1,
          gap: 1.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: existing ? 'rgba(34,197,94,0.35)' : 'divider',
          bgcolor: existing ? 'rgba(34,197,94,0.05)' : 'transparent',
          mb: 0.5,
        }}
      >
        {/* Match # */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>
          #{fixture.matchNumber}
        </Typography>

        {/* Date */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 58 }}>
          {new Date(fixture.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Typography>

        {/* Teams */}
        <Typography variant="body2" sx={{ flex: 1 }}>
          {t1?.flag ?? ''} <strong>{t1?.name ?? fixture.team1}</strong>
          {' vs '}
          <strong>{t2?.name ?? fixture.team2}</strong> {t2?.flag ?? ''}
        </Typography>

        {/* Venue */}
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 80 }}>
          {fixture.city}
        </Typography>

        {/* Current result badge */}
        {existing && (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={`${TEAMS[fixture.team1]?.code ?? fixture.team1} ${existing.goals1 ?? '?'}–${existing.goals2 ?? '?'} ${TEAMS[fixture.team2]?.code ?? fixture.team2}${existing.result === 'DRAW' ? ' (D)' : ''}`}
            size="small"
            sx={{
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          />
        )}

        {/* Enter/Edit button */}
        <Button
          size="small"
          variant={open ? 'contained' : 'outlined'}
          color={existing ? 'secondary' : 'primary'}
          startIcon={existing ? <EditIcon fontSize="small" /> : undefined}
          onClick={() => { setOpen((v) => !v); setError(''); setSuccess(false); }}
          sx={{ minWidth: 80, borderRadius: 2 }}
        >
          {open ? 'Cancel' : existing ? 'Edit' : 'Enter'}
        </Button>
      </Box>

      {/* Inline form */}
      <Collapse in={open}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1,
            pb: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" sx={{ minWidth: 32 }}>
            {t1?.flag ?? ''} {t1?.code ?? fixture.team1}
          </Typography>
          <TextField
            type="number"
            size="small"
            label="Goals"
            value={goals1}
            onChange={(e) => setGoals1(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 20 } }}
            sx={{ width: 80 }}
          />
          <Typography variant="body2" color="text.secondary">vs</Typography>
          <TextField
            type="number"
            size="small"
            label="Goals"
            value={goals2}
            onChange={(e) => setGoals2(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 20 } }}
            sx={{ width: 80 }}
          />
          <Typography variant="body2">
            {t2?.flag ?? ''} {t2?.code ?? fixture.team2}
          </Typography>

          {/* Derived result preview */}
          {derivedResult && (
            <Chip
              label={derivedResult === 'DRAW' ? 'Draw' : `${TEAMS[derivedResult]?.flag ?? ''} ${TEAMS[derivedResult]?.code ?? derivedResult} wins`}
              size="small"
              color={derivedResult === 'DRAW' ? 'default' : 'success'}
              sx={{ fontWeight: 700 }}
            />
          )}

          <Button
            variant="contained"
            size="small"
            disabled={!bothValid || saving}
            onClick={handleSave}
            sx={{ borderRadius: 2 }}
          >
            {saving ? <CircularProgress size={16} /> : 'Save'}
          </Button>

          {error && (
            <Typography variant="caption" color="error.main">{error}</Typography>
          )}
          {success && (
            <Typography variant="caption" color="success.main">Saved!</Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Knockout result form ────────────────────────────────────────────────────

interface KnockoutResultFormProps {
  fixture: Fixture;
  existing: StoredResult | undefined;
  onSaved: (result: StoredResult) => void;
}

function KnockoutResultForm({ fixture, existing, onSaved }: KnockoutResultFormProps) {
  const [open, setOpen] = useState(false);
  const [team1Code, setTeam1Code] = useState<string>(existing?.result !== 'DRAW' ? (existing ? fixture.team1 !== 'TBD' ? fixture.team1 : '' : '') : '');
  const [team2Code, setTeam2Code] = useState<string>(existing?.result !== 'DRAW' ? (existing ? fixture.team2 !== 'TBD' ? fixture.team2 : '' : '') : '');
  const [goals1, setGoals1] = useState<string>(existing?.goals1?.toString() ?? '');
  const [goals2, setGoals2] = useState<string>(existing?.goals2?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const g1 = parseInt(goals1, 10);
  const g2 = parseInt(goals2, 10);
  const bothValid = !isNaN(g1) && !isNaN(g2) && g1 >= 0 && g2 >= 0 && team1Code.trim() && team2Code.trim() && g1 !== g2;
  const derivedResult = (!isNaN(g1) && !isNaN(g2) && team1Code && team2Code)
    ? (g1 > g2 ? team1Code.toUpperCase() : g2 > g1 ? team2Code.toUpperCase() : null)
    : null;

  async function handleSave() {
    if (!bothValid || !derivedResult) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/update-fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchNumber: fixture.matchNumber,
          result: derivedResult,
          goals1: g1,
          goals2: g2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSuccess(true);
      setOpen(false);
      onSaved({ ...data.fixtureResult, updatedAt: new Date(data.fixtureResult.updatedAt).toISOString() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const phaseConfig = PHASES.find((p) => p.id === fixture.phase);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 1,
          gap: 1.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: existing ? 'rgba(34,197,94,0.35)' : 'divider',
          bgcolor: existing ? 'rgba(34,197,94,0.05)' : 'transparent',
          mb: 0.5,
          flexWrap: 'wrap',
        }}
      >
        {/* Match # */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>
          #{fixture.matchNumber}
        </Typography>

        {/* Date */}
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 58 }}>
          {new Date(fixture.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Typography>

        {/* Phase chip */}
        {phaseConfig && (
          <Chip
            label={`${phaseConfig.icon} ${PHASE_LABELS[fixture.phase]}`}
            size="small"
            sx={{ fontSize: '0.65rem', height: 18, background: `${phaseConfig.color}22`, color: phaseConfig.color }}
          />
        )}

        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          TBD vs TBD
        </Typography>

        {/* Result badge */}
        {existing && (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={`${existing.result} ${existing.goals1 ?? '?'}–${existing.goals2 ?? '?'}`}
            size="small"
            sx={{
              background: 'rgba(34,197,94,0.15)',
              color: '#22c55e',
              fontWeight: 700,
              fontSize: '0.7rem',
            }}
          />
        )}

        <Button
          size="small"
          variant={open ? 'contained' : 'outlined'}
          color={existing ? 'secondary' : 'primary'}
          startIcon={existing ? <EditIcon fontSize="small" /> : undefined}
          onClick={() => { setOpen((v) => !v); setError(''); setSuccess(false); }}
          sx={{ minWidth: 80, borderRadius: 2 }}
        >
          {open ? 'Cancel' : existing ? 'Edit' : 'Enter'}
        </Button>
      </Box>

      <Collapse in={open}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 1, pb: 1.5 }}>
          <TextField
            size="small"
            label="Team 1 code"
            placeholder="e.g. ARG"
            value={team1Code}
            onChange={(e) => setTeam1Code(e.target.value.toUpperCase())}
            sx={{ width: 120 }}
            slotProps={{ htmlInput: { maxLength: 5 } }}
          />
          <TextField
            type="number"
            size="small"
            label="Goals"
            value={goals1}
            onChange={(e) => setGoals1(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 20 } }}
            sx={{ width: 80 }}
          />
          <Typography variant="body2" color="text.secondary">vs</Typography>
          <TextField
            type="number"
            size="small"
            label="Goals"
            value={goals2}
            onChange={(e) => setGoals2(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 20 } }}
            sx={{ width: 80 }}
          />
          <TextField
            size="small"
            label="Team 2 code"
            placeholder="e.g. FRA"
            value={team2Code}
            onChange={(e) => setTeam2Code(e.target.value.toUpperCase())}
            sx={{ width: 120 }}
            slotProps={{ htmlInput: { maxLength: 5 } }}
          />

          {derivedResult && (
            <Chip
              label={`${TEAMS[derivedResult]?.flag ?? ''} ${derivedResult} wins`}
              size="small"
              color="success"
              sx={{ fontWeight: 700 }}
            />
          )}
          {!isNaN(g1) && !isNaN(g2) && g1 === g2 && g1 >= 0 && team1Code && team2Code && (
            <Chip label="No draws in knockouts" size="small" color="warning" />
          )}

          <Button
            variant="contained"
            size="small"
            disabled={!bothValid || saving}
            onClick={handleSave}
            sx={{ borderRadius: 2 }}
          >
            {saving ? <CircularProgress size={16} /> : 'Save'}
          </Button>

          {error && (
            <Typography variant="caption" color="error.main">{error}</Typography>
          )}
          {success && (
            <Typography variant="caption" color="success.main">Saved!</Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── Main AdminPanel ─────────────────────────────────────────────────────────

export default function AdminPanel({ existingResults, existingBonusAnswers }: AdminPanelProps) {
  const router = useRouter();
  const [results, setResults] = useState<Map<number, StoredResult>>(
    () => new Map(existingResults.map((r) => [r.matchNumber, r]))
  );
  const [bonusAnswers, setBonusAnswers] = useState<Map<string, StoredBonusAnswer>>(
    () => new Map(existingBonusAnswers.map((a) => [a.questionId, a]))
  );
  const [bonusDraft, setBonusDraft] = useState<Record<string, string>>(
    () => Object.fromEntries(existingBonusAnswers.map((a) => [a.questionId, a.answer]))
  );
  const [bonusSaving, setBonusSaving] = useState<Record<string, boolean>>({});
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleSaved = useCallback((saved: StoredResult) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(saved.matchNumber, saved);
      return next;
    });
    setToastMsg(`Match #${saved.matchNumber} saved!`);
    setToastOpen(true);
    router.refresh();
  }, [router]);

  async function saveBonusAnswer(questionId: string) {
    const answer = bonusDraft[questionId]?.trim();
    if (!answer) return;
    setBonusSaving((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await fetch('/api/update-bonus-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      const now = new Date().toISOString();
      setBonusAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, { questionId, answer, updatedAt: now, updatedBy: 'admin' });
        return next;
      });
      setToastMsg(`Bonus answer saved (${data.leaguesUpdated} leagues updated)`);
      setToastOpen(true);
    } catch (e: unknown) {
      setToastMsg(e instanceof Error ? e.message : 'Save failed');
      setToastOpen(true);
    } finally {
      setBonusSaving((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  const totalResults = results.size;
  const groupResults = [...results.values()].filter((r) =>
    GROUP_FIXTURES.some((f) => f.matchNumber === r.matchNumber)
  ).length;
  const knockoutResultsCount = totalResults - groupResults;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <NavBar />
      <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <AdminPanelSettingsIcon sx={{ fontSize: '2.5rem', color: 'secondary.main' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Admin — Enter Results
            </Typography>
            <Typography color="text.secondary">
              {totalResults} / {GROUP_FIXTURES.length + KNOCKOUT_FIXTURES.length} results entered
              {' '}({groupResults} group · {knockoutResultsCount} knockout)
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<PeopleIcon />}
            component={Link}
            href="/admin/picks"
            sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
          >
            View All Picks
          </Button>
        </Box>

        {/* ── Section 1: Group Stage ── */}
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Group Stage — 72 Matches
        </Typography>

        {GROUPS.map((group) => {
          const fixtures = GROUP_FIXTURES.filter((f) => f.group === group);
          const teams = [...new Set(fixtures.flatMap((f) => [f.team1, f.team2]))].map((c) => TEAMS[c]);
          const doneCount = fixtures.filter((f) => results.has(f.matchNumber)).length;

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 800 }}>Group {group}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {teams.map((t) => t && (
                      <Chip
                        key={t.code}
                        label={`${t.flag} ${t.code}`}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, background: `${t.primaryColor}33`, color: 'text.primary' }}
                      />
                    ))}
                  </Box>
                  <Chip
                    label={`${doneCount}/${fixtures.length}`}
                    size="small"
                    color={doneCount === fixtures.length ? 'success' : doneCount > 0 ? 'warning' : 'default'}
                    sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {fixtures.map((f) => (
                  <GroupResultForm
                    key={f.matchNumber}
                    fixture={f}
                    existing={results.get(f.matchNumber)}
                    onSaved={handleSaved}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
          );
        })}

        {/* ── Section 2: Knockout Rounds ── */}
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 2 }}>
          Knockout Rounds — 32 Matches
        </Typography>

        {(['round32', 'round16', 'quarter', 'semi', 'final'] as Phase[]).map((phase) => {
          const fixtures = KNOCKOUT_FIXTURES.filter((f) => f.phase === phase);
          const phaseConfig = PHASES.find((p) => p.id === phase);
          const doneCount = fixtures.filter((f) => results.has(f.matchNumber)).length;

          return (
            <Card
              key={phase}
              sx={{
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: phaseConfig?.color, flexGrow: 1 }}>
                    {phaseConfig?.icon} {PHASE_LABELS[phase]}
                  </Typography>
                  <Chip
                    label={`${doneCount}/${fixtures.length}`}
                    size="small"
                    color={doneCount === fixtures.length ? 'success' : doneCount > 0 ? 'warning' : 'default'}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                </Box>
                {fixtures.map((f) => (
                  <KnockoutResultForm
                    key={f.matchNumber}
                    fixture={f}
                    existing={results.get(f.matchNumber)}
                    onSaved={handleSaved}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* ── Section 3: Bonus Answers ── */}
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 4, mb: 1 }}>
          Bonus Question Answers
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Set the official answer for each bonus question. Saving triggers a full leaderboard recalculation across all leagues.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {BONUS_QUESTIONS.map((q) => {
            const stored = bonusAnswers.get(q.id);
            const saving = bonusSaving[q.id] ?? false;
            const draft = bonusDraft[q.id] ?? '';
            const isDirty = draft.trim() !== (stored?.answer ?? '');

            return (
              <Card key={q.id} sx={{ border: '1px solid', borderColor: stored ? 'rgba(34,197,94,0.35)' : 'divider', bgcolor: stored ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{q.question}</Typography>
                      {stored && (
                        <Typography variant="caption" color="text.secondary">
                          Set by {stored.updatedBy} · {new Date(stored.updatedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                    <Chip label={`${q.points} pts`} size="small" sx={{ background: 'rgba(201,167,58,0.15)', color: '#C9A73A', fontWeight: 700 }} />
                    <TextField
                      size="small"
                      label="Official answer"
                      value={draft}
                      onChange={(e) => setBonusDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={q.type === 'number' ? 'e.g. 163' : q.type === 'team' ? 'e.g. ARG' : 'e.g. Mbappe'}
                      sx={{ width: 180 }}
                      type={q.type === 'number' ? 'number' : 'text'}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!draft.trim() || !isDirty || saving}
                      onClick={() => saveBonusAnswer(q.id)}
                      sx={{ borderRadius: 2, minWidth: 80 }}
                    >
                      {saving ? <CircularProgress size={16} /> : stored ? 'Update' : 'Save'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Container>

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)} sx={{ borderRadius: 2 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
}
