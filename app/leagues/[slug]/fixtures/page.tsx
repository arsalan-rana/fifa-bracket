'use client';

import { use } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { GROUPS, GROUP_FIXTURES, KNOCKOUT_FIXTURES, TEAMS, PHASES } from '../../../../data/fifa-2026';
import type { Phase } from '../../../../data/fifa-2026';

interface Props {
  params: Promise<{ slug: string }>;
}

const PHASE_LABELS: Record<Phase, string> = {
  group: 'Group Stage',
  round32: 'Round of 32',
  round16: 'Round of 16',
  quarter: 'Quarter-Finals',
  semi: 'Semi-Finals',
  final: 'Final',
};

export default function FixturesPage({ params }: Props) {
  use(params); // consume params

  return (
    <Box sx={{ background: '#0A0F1E', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
          <EventNoteIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'secondary.main' }} />
          Fixtures
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          All 104 matches · June 11 – July 19, 2026
        </Typography>

        {/* Tournament summary */}
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

          return (
            <Accordion
              key={group}
              sx={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 2,
                mb: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 800 }}>Group {group}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {teams.map((t) => t && (
                      <Chip
                        key={t.code}
                        label={`${t.flag} ${t.code}`}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, background: `${t.primaryColor}22`, color: '#fff' }}
                      />
                    ))}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {fixtures.map((f) => {
                  const t1 = TEAMS[f.team1];
                  const t2 = TEAMS[f.team2];
                  return (
                    <Box
                      key={f.matchNumber}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        gap: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                        {new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {t1?.flag ?? ''} <strong>{t1?.name ?? f.team1}</strong>
                        {' vs '}
                        <strong>{t2?.name ?? f.team2}</strong> {t2?.flag ?? ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {f.city}
                      </Typography>
                      {f.aiPrediction && f.aiPrediction !== 'DRAW' && (
                        <Chip
                          label={`🤖 ${TEAMS[f.aiPrediction]?.code ?? f.aiPrediction}`}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 18, opacity: 0.6 }}
                        />
                      )}
                    </Box>
                  );
                })}
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

          return (
            <Card key={phase} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: phaseConfig.color }}>
                  {phaseConfig.icon} {PHASE_LABELS[phase]}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Deadline: {new Date(phaseConfig.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Typography>
                {fixtures.map((f) => (
                  <Box
                    key={f.matchNumber}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 0.75,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      gap: 2,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                      {new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }} color="text.secondary">
                      TBD vs TBD
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {f.city}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </Container>
    </Box>
  );
}
