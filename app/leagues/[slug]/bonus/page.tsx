'use client';

import { use, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import StarsIcon from '@mui/icons-material/Stars';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { BONUS_QUESTIONS, TEAMS, isPhasePastDeadline } from '../../../../data/fifa-2026';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function BonusPage({ params }: Props) {
  const { slug } = use(params);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leagueId, setLeagueId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const isPastDeadline = isPhasePastDeadline('group');

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);

        const predRes = await fetch(`/api/get-predictions?leagueId=${leagueData.id}`);
        if (predRes.ok) {
          const data = await predRes.json();
          const answerMap: Record<string, string> = {};
          for (const bp of data.bonusPredictions) answerMap[bp.questionId] = bp.answer;
          setAnswers(answerMap);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function handleSubmit() {
    if (!leagueId) return;
    setSubmitting(true);

    const payload = Object.entries(answers)
      .filter(([, v]) => v?.trim())
      .map(([questionId, answer]) => ({ questionId, answer }));

    if (payload.length === 0) {
      setSnack({ msg: 'Please answer at least one question', severity: 'error' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/submit-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, answers: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setSnack({ msg: `${payload.length} bonus answers saved!`, severity: 'success' });
      } else {
        setSnack({ msg: data.error || 'Failed', severity: 'error' });
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

  const completedCount = Object.values(answers).filter((v) => v?.trim()).length;

  return (
    <Box sx={{ background: '#0A0F1E', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
          <StarsIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
          Bonus Questions
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Answer all questions before the Group Stage deadline for bonus points. Points vary by question difficulty.
        </Typography>

        {isPastDeadline && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Deadline has passed — submissions are late.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {BONUS_QUESTIONS.map((q) => (
            <Card key={q.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography sx={{ fontWeight: 700, flex: 1, mr: 2 }}>
                    {q.question}
                  </Typography>
                  <Chip
                    label={`${q.points} pts`}
                    size="small"
                    sx={{ background: 'rgba(201,167,58,0.15)', color: '#C9A73A', fontWeight: 700 }}
                  />
                </Box>

                {q.aiPrediction && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, opacity: 0.7 }}>
                    <SmartToyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      AI prediction:{' '}
                      <strong>
                        {q.type === 'team' && TEAMS[q.aiPrediction]
                          ? `${TEAMS[q.aiPrediction].flag} ${TEAMS[q.aiPrediction].name}`
                          : q.aiPrediction}
                      </strong>
                    </Typography>
                  </Box>
                )}

                {q.type === 'team' ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>Select team</InputLabel>
                    <Select
                      value={answers[q.id] ?? ''}
                      label="Select team"
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={false}
                    >
                      {Object.values(TEAMS).map((t) => (
                        <MenuItem key={t.code} value={t.code}>
                          {t.flag} {t.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : q.options ? (
                  <FormControl fullWidth size="small">
                    <InputLabel>Select answer</InputLabel>
                    <Select
                      value={answers[q.id] ?? ''}
                      label="Select answer"
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    >
                      {q.options.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    size="small"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.type === 'number' ? 'Enter a number' : 'Your answer'}
                    type={q.type === 'number' ? 'number' : 'text'}
                  />
                )}

                {answers[q.id] && (
                  <Chip
                    label="✓ Answered"
                    size="small"
                    color="success"
                    sx={{ mt: 1, height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting || completedCount === 0}
            sx={{ px: 6, py: 1.5 }}
          >
            {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '⭐ '}
            Save {completedCount} Bonus {completedCount === 1 ? 'Answer' : 'Answers'}
          </Button>
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
