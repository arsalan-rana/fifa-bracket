'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Link from 'next/link';
import NavBar from '../../components/NavBar';
import { ALL_FIXTURES, TEAMS, PHASES, GROUPS, type Phase } from '../../../data/fifa-2026';

interface League { id: string; name: string; slug: string }
interface Member { userId: string; name: string; email: string; image: string | null; isVerified: boolean }
interface Prediction { userId: string; matchNumber: number; predictedWinner: string; isLate: boolean }
interface FixtureResult { matchNumber: number; result: string }

interface PicksData {
  members: Member[];
  predictions: Prediction[];
  results: FixtureResult[];
}

const PHASE_ORDER: Phase[] = ['group', 'round32', 'round16', 'quarter', 'semi', 'final'];
const PHASE_LABEL: Record<Phase, string> = {
  group: 'Group Stage',
  round32: 'Round of 32',
  round16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  final: 'Final',
};

function MemberBubble({ member, late }: { member: Member; late?: boolean }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        background: late ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)',
        border: '1px solid',
        borderColor: late ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.12)',
        borderRadius: 4,
        px: 0.8,
        py: 0.2,
        mr: 0.5,
        mb: 0.5,
      }}
    >
      <Avatar src={member.image ?? undefined} sx={{ width: 16, height: 16, fontSize: '0.55rem' }}>
        {member.name[0]}
      </Avatar>
      <Typography variant="caption" sx={{ fontSize: '0.72rem', lineHeight: 1.2 }}>
        {member.name.split(' ')[0]}
        {late && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </Typography>
    </Box>
  );
}

function MatchCard({
  fixture,
  members,
  predictions,
  result,
}: {
  fixture: typeof ALL_FIXTURES[0];
  members: Member[];
  predictions: Prediction[];
  result: FixtureResult | undefined;
}) {
  const t1 = TEAMS[fixture.team1];
  const t2 = TEAMS[fixture.team2];

  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const matchPreds = predictions.filter((p) => p.matchNumber === fixture.matchNumber);
  const submittedIds = new Set(matchPreds.map((p) => p.userId));
  const missing = members.filter((m) => !submittedIds.has(m.userId));

  const options = fixture.canDraw
    ? [fixture.team1, 'DRAW', fixture.team2]
    : [fixture.team1, fixture.team2];

  const groupedByPick: Record<string, Member[]> = {};
  for (const opt of options) groupedByPick[opt] = [];
  for (const pred of matchPreds) {
    const member = memberMap.get(pred.userId);
    if (member) groupedByPick[pred.predictedWinner]?.push(member);
  }

  const dateStr = new Date(fixture.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Card
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: result ? 'rgba(34,197,94,0.25)' : 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Match header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
            #{fixture.matchNumber}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
            {t1 ? `${t1.flag} ${t1.code}` : fixture.team1}
            {' vs '}
            {t2 ? `${t2.flag} ${t2.code}` : fixture.team2}
          </Typography>
          <Typography variant="caption" color="text.secondary">{dateStr}</Typography>
          {result && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '0.8rem !important' }} />}
              label={result.result === 'DRAW' ? 'Draw' : (TEAMS[result.result]?.flag ?? '') + ' ' + result.result}
              size="small"
              sx={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 700, fontSize: '0.65rem', height: 18 }}
            />
          )}
          <Chip
            label={`${submittedIds.size}/${members.length}`}
            size="small"
            color={submittedIds.size === members.length ? 'success' : submittedIds.size > 0 ? 'warning' : 'default'}
            sx={{ height: 18, fontSize: '0.65rem' }}
          />
        </Box>

        {/* Pick rows */}
        {options.map((opt) => {
          const pickers = groupedByPick[opt] ?? [];
          const isCorrect = result?.result === opt;
          if (pickers.length === 0 && !isCorrect) return null;
          const team = opt !== 'DRAW' ? TEAMS[opt] : null;

          return (
            <Box
              key={opt}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mb: 0.5,
                p: 0.5,
                borderRadius: 1,
                bgcolor: isCorrect ? 'rgba(34,197,94,0.08)' : 'transparent',
                border: isCorrect ? '1px solid rgba(34,197,94,0.2)' : 'none',
              }}
            >
              <Box sx={{ minWidth: 56, display: 'flex', alignItems: 'center', gap: 0.5, pt: 0.3 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                  {team ? `${team.flag} ${team.code}` : 'DRAW'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  ({pickers.length})
                </Typography>
                {isCorrect && <CheckCircleIcon sx={{ fontSize: '0.75rem', color: '#22c55e' }} />}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', flex: 1 }}>
                {pickers.map((m) => (
                  <MemberBubble
                    key={m.userId}
                    member={m}
                    late={matchPreds.find((p) => p.userId === m.userId && p.matchNumber === fixture.matchNumber)?.isLate}
                  />
                ))}
                {pickers.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                    No one
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}

        {/* Not submitted */}
        {missing.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 0.5, p: 0.5, borderRadius: 1, bgcolor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Box sx={{ minWidth: 56, pt: 0.3 }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'error.main', fontWeight: 700 }}>
                <WarningAmberIcon sx={{ fontSize: '0.7rem', mr: 0.3 }} />
                Missing
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', flex: 1 }}>
              {missing.map((m) => (
                <MemberBubble key={m.userId} member={m} />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPicksPanel({ leagues }: { leagues: League[] }) {
  const [leagueId, setLeagueId] = useState(leagues[0]?.id ?? '');
  const [phase, setPhase] = useState<Phase>('group');
  const [data, setData] = useState<PicksData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    setLoading(true);
    fetch(`/api/admin-league-picks?leagueId=${leagueId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [leagueId]);

  const phaseFixtures = ALL_FIXTURES.filter((f) => f.phase === phase);
  const resultMap = new Map(data?.results.map((r) => [r.matchNumber, r]) ?? []);

  const submittedForPhase = new Set(
    (data?.predictions ?? [])
      .filter((p) => phaseFixtures.some((f) => f.matchNumber === p.matchNumber))
      .map((p) => p.userId)
  );
  const totalMembers = data?.members.length ?? 0;
  const phaseConfig = PHASES.find((p) => p.id === phase);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <NavBar />
      <Box sx={{ py: 3 }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <AdminPanelSettingsIcon sx={{ color: 'secondary.main', fontSize: '2rem' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>All Picks</Typography>
              <Typography variant="caption" color="text.secondary">
                <Link href="/admin" style={{ color: 'inherit' }}>← Admin</Link>
              </Typography>
            </Box>
            {data && (
              <Chip
                label={`${totalMembers} members · * = late pick`}
                size="small"
                sx={{ opacity: 0.7 }}
              />
            )}
          </Box>

          {/* League selector */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>League</InputLabel>
            <Select value={leagueId} label="League" onChange={(e) => setLeagueId(e.target.value)}>
              {leagues.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress color="secondary" />
            </Box>
          )}

          {!loading && data && (
            <>
              {/* Phase summary bar */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {PHASE_ORDER.map((p) => {
                  const pf = ALL_FIXTURES.filter((f) => f.phase === p);
                  const submitted = new Set(
                    (data.predictions ?? [])
                      .filter((pr) => pf.some((f) => f.matchNumber === pr.matchNumber))
                      .map((pr) => pr.userId)
                  ).size;
                  const hasResults = pf.some((f) => resultMap.has(f.matchNumber));
                  const cfg = PHASES.find((ph) => ph.id === p);
                  return (
                    <Chip
                      key={p}
                      label={`${cfg?.icon ?? ''} ${cfg?.shortName ?? p} ${submitted}/${totalMembers}`}
                      size="small"
                      onClick={() => setPhase(p)}
                      sx={{
                        cursor: 'pointer',
                        background: phase === p ? (cfg?.color ?? '#C9A73A') + '33' : 'transparent',
                        borderColor: phase === p ? (cfg?.color ?? '#C9A73A') : 'divider',
                        color: phase === p ? (cfg?.color ?? '#C9A73A') : 'text.secondary',
                        border: '1px solid',
                        fontWeight: phase === p ? 700 : 400,
                      }}
                    />
                  );
                })}
              </Box>

              {/* Phase tabs */}
              <Tabs
                value={phase}
                onChange={(_, v) => setPhase(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider', display: { xs: 'none', sm: 'flex' } }}
              >
                {PHASE_ORDER.map((p) => {
                  const cfg = PHASES.find((ph) => ph.id === p);
                  return (
                    <Tab
                      key={p}
                      value={p}
                      label={`${cfg?.icon ?? ''} ${PHASE_LABEL[p]}`}
                      sx={{ fontSize: '0.75rem', minWidth: 80 }}
                    />
                  );
                })}
              </Tabs>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {phaseConfig?.icon} <strong>{PHASE_LABEL[phase]}</strong>
                {' — '}{submittedForPhase.size}/{totalMembers} members submitted picks
              </Typography>

              {/* Group stage: accordion per group */}
              {phase === 'group' ? (
                GROUPS.map((group) => {
                  const groupFixtures = phaseFixtures.filter((f) => f.group === group);
                  const teams = [...new Set(groupFixtures.flatMap((f) => [f.team1, f.team2]))];
                  const doneCount = groupFixtures.filter((f) => resultMap.has(f.matchNumber)).length;

                  return (
                    <Accordion
                      key={group}
                      defaultExpanded={false}
                      sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1, '&:before': { display: 'none' } }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                          <Typography sx={{ fontWeight: 800 }}>Group {group}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {teams.slice(0, 4).map((c) => TEAMS[c] && (
                              <Typography key={c} variant="caption">{TEAMS[c].flag}</Typography>
                            ))}
                          </Box>
                          <Chip
                            label={`${doneCount}/${groupFixtures.length} results`}
                            size="small"
                            color={doneCount === groupFixtures.length ? 'success' : doneCount > 0 ? 'warning' : 'default'}
                            sx={{ ml: 'auto', height: 18, fontSize: '0.65rem' }}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        {groupFixtures.map((f) => (
                          <MatchCard
                            key={f.matchNumber}
                            fixture={f}
                            members={data.members}
                            predictions={data.predictions}
                            result={resultMap.get(f.matchNumber)}
                          />
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  );
                })
              ) : (
                /* Knockout: flat list */
                phaseFixtures.map((f) => (
                  <MatchCard
                    key={f.matchNumber}
                    fixture={f}
                    members={data.members}
                    predictions={data.predictions}
                    result={resultMap.get(f.matchNumber)}
                  />
                ))
              )}

              {phaseFixtures.length === 0 && (
                <Alert severity="info">No fixtures for this phase yet.</Alert>
              )}
            </>
          )}

          {!loading && leagues.length === 0 && (
            <Alert severity="info">No leagues found.</Alert>
          )}
        </Container>
      </Box>
    </Box>
  );
}
