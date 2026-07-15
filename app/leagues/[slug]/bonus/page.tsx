'use client';

import { use, useEffect, useState, useCallback } from 'react';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import StarsIcon from '@mui/icons-material/Stars';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockClockIcon from '@mui/icons-material/LockClock';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useSession } from 'next-auth/react';
import { BONUS_QUESTIONS, TEAMS, isPhasePastDeadline } from '../../../../data/fifa-2026';
import { parseBonusAnswers, isBonusAnswerCorrect } from '../../../../lib/tournament';

interface Props {
  params: Promise<{ slug: string }>;
}

interface BonusMember { userId: string; name: string; image: string | null }
interface BonusPrediction { userId: string; questionId: string; answer: string }
interface OfficialAnswer { questionId: string; answer: string }

// ─── Everyone's picks tab ─────────────────────────────────────────────────────

function EveryonesPicks({ leagueId }: { leagueId: string }) {
  const [members, setMembers] = useState<BonusMember[]>([]);
  const [predictions, setPredictions] = useState<BonusPrediction[]>([]);
  const [officialAnswers, setOfficialAnswers] = useState<OfficialAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!leagueId) return;
    fetch(`/api/league-bonus-picks?leagueId=${leagueId}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error ?? 'Failed to load');
        }
        return r.json();
      })
      .then((d) => {
        setMembers(d.members);
        setPredictions(d.predictions);
        setOfficialAnswers(d.officialAnswers);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress color="secondary" /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  const officialMap = new Map(officialAnswers.map((a) => [a.questionId, a.answer]));
  const memberMap = new Map(members.map((m) => [m.userId, m]));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {BONUS_QUESTIONS.map((q) => {
        const official = officialMap.get(q.id);
        const qPreds = predictions.filter((p) => p.questionId === q.id);

        // For number type, find closest answer(s); otherwise match against the (possibly multi-value) official answer
        let winnerIds: Set<string> | null = null;
        if (q.type === 'number' && official) {
          const correctVal = parseFloat(official);
          if (!isNaN(correctVal)) {
            let minDist = Infinity;
            for (const p of qPreds) {
              const v = parseFloat(p.answer);
              if (!isNaN(v)) minDist = Math.min(minDist, Math.abs(v - correctVal));
            }
            winnerIds = new Set(
              qPreds
                .filter((p) => !isNaN(parseFloat(p.answer)) && Math.abs(parseFloat(p.answer) - correctVal) === minDist)
                .map((p) => p.userId)
            );
          }
        } else if (official) {
          winnerIds = new Set(
            qPreds.filter((p) => isBonusAnswerCorrect(p.answer, official)).map((p) => p.userId)
          );
        }

        const answerValues = official && q.type !== 'number' ? parseBonusAnswers(official) : official ? [official] : [];
        const winners = winnerIds ? [...winnerIds].map((id) => memberMap.get(id)).filter((m): m is BonusMember => !!m) : [];

        return (
          <Card key={q.id}>
            <CardContent>
              {/* Question header */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                <Typography sx={{ fontWeight: 700, flex: 1 }}>{q.question}</Typography>
                <Chip
                  label={`${q.points} pts`}
                  size="small"
                  sx={{ background: 'rgba(201,167,58,0.15)', color: '#C9A73A', fontWeight: 700, flexShrink: 0 }}
                />
              </Box>

              {/* Winner reveal */}
              {official ? (
                <Box
                  sx={{
                    mb: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(201,167,58,0.16) 0%, rgba(201,167,58,0.04) 100%)',
                    border: '1px solid rgba(201,167,58,0.35)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                    <EmojiEventsIcon sx={{ fontSize: '1rem', color: '#C9A73A' }} />
                    <Typography variant="overline" sx={{ fontWeight: 800, color: '#C9A73A', letterSpacing: 0.8, lineHeight: 1 }}>
                      {q.type === 'number' ? 'Official total — closest wins' : answerValues.length > 1 ? 'The answers (tied)' : 'The answer'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: winners.length > 0 ? 1.25 : 0 }}>
                    {answerValues.map((val) => (
                      <Chip
                        key={val}
                        label={q.type === 'team' && TEAMS[val] ? `${TEAMS[val].flag} ${TEAMS[val].name}` : val}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: 'rgba(201,167,58,0.22)', color: '#C9A73A' }}
                      />
                    ))}
                  </Box>
                  {winners.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        ✅ {winners.length} of {members.length} got it right
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {winners.map((w) => (
                          <Box key={w.userId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Avatar src={w.image ?? undefined} sx={{ width: 20, height: 20, fontSize: '0.6rem' }}>
                              {w.name[0]}
                            </Avatar>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{w.name.split(' ')[0]}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, opacity: 0.5 }}>
                  <LockClockIcon sx={{ fontSize: '0.85rem' }} />
                  <Typography variant="caption" color="text.secondary">Official answer not set yet</Typography>
                </Box>
              )}

              {/* Member answers */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {members.map((member) => {
                  const pred = qPreds.find((p) => p.userId === member.userId);
                  const answer = pred?.answer;
                  const displayAnswer = answer && q.type === 'team' && TEAMS[answer]
                    ? `${TEAMS[answer].flag} ${TEAMS[answer].name}`
                    : answer;

                  const isCorrect: boolean | null = official && answer ? (winnerIds?.has(member.userId) ?? false) : null;

                  const distFromOfficial = q.type === 'number' && official && answer
                    ? Math.abs(parseFloat(answer) - parseFloat(official))
                    : null;

                  return (
                    <Box
                      key={member.userId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.8,
                        borderRadius: 1,
                        bgcolor: isCorrect === true ? 'rgba(34,197,94,0.07)' : isCorrect === false ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid',
                        borderColor: isCorrect === true ? 'rgba(34,197,94,0.2)' : isCorrect === false ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                      }}
                    >
                      <Avatar src={member.image ?? undefined} sx={{ width: 24, height: 24, fontSize: '0.65rem' }}>
                        {member.name[0]}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80, flex: 1 }}>
                        {member.name.split(' ')[0]}
                      </Typography>
                      {answer ? (
                        <>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            {displayAnswer}
                          </Typography>
                          {distFromOfficial !== null && !isNaN(distFromOfficial) && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              (off by {distFromOfficial})
                            </Typography>
                          )}
                          {isCorrect === true && <CheckCircleIcon sx={{ fontSize: '1rem', color: '#22c55e' }} />}
                          {isCorrect === false && <CancelIcon sx={{ fontSize: '1rem', color: 'rgba(239,68,68,0.6)' }} />}
                        </>
                      ) : (
                        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                          No answer
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

// ─── Main bonus page ──────────────────────────────────────────────────────────

export default function BonusPage({ params }: Props) {
  const { slug } = use(params);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [leagueId, setLeagueId] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState(0);
  const { data: session } = useSession();

  const isPastDeadline = isPhasePastDeadline('group');
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdminUser = !!adminEmail && session?.user?.email === adminEmail;
  const canViewEveryone = isPastDeadline || isAdminUser;

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);
        setIsVerified(leagueData.isVerified !== false);

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

  // Auto-switch to everyone's tab once the deadline passes for regular members
  useEffect(() => {
    if (isPastDeadline && !isAdminUser && tab === 0) setTab(1);
  }, [isPastDeadline, isAdminUser]);

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
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          <StarsIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
          Bonus Questions
        </Typography>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab label="My Picks" />
          <Tab
            label="Everyone's Picks"
            disabled={!canViewEveryone}
            title={!canViewEveryone ? 'Revealed after the group stage starts' : undefined}
          />
        </Tabs>

        {/* ── Tab 0: My Picks ── */}
        {tab === 0 && (
          <>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Answer all questions before the Group Stage deadline for bonus points. Points vary by question difficulty.
            </Typography>

            {isPastDeadline && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Deadline has passed — bonus answers are locked and can no longer be changed.
              </Alert>
            )}

            {!isVerified && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Your buy-in payment is pending verification. You cannot submit bonus answers until the league owner verifies your payment.
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
                          disabled={isPastDeadline}
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
                          disabled={isPastDeadline}
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
                        disabled={isPastDeadline}
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
                disabled={submitting || completedCount === 0 || !isVerified || isPastDeadline}
                title={isPastDeadline ? 'Deadline has passed' : !isVerified ? 'Your buy-in payment is pending verification' : undefined}
                sx={{ px: 6, py: 1.5 }}
              >
                {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '⭐ '}
                Save {completedCount} Bonus {completedCount === 1 ? 'Answer' : 'Answers'}
              </Button>
            </Box>
          </>
        )}

        {/* ── Tab 1: Everyone's Picks ── */}
        {tab === 1 && leagueId && (
          <>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Everyone's bonus answers for this league. Correct answers highlighted in green once results are official.
            </Typography>
            <EveryonesPicks leagueId={leagueId} />
          </>
        )}
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
