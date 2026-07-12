'use client';

import { use, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { PHASES } from '../../../../data/fifa-2026';

interface Props {
  params: Promise<{ slug: string }>;
}

interface AwardWinner {
  userId: string;
  name: string;
  image: string | null;
  value: string;
}

interface AwardResult {
  key: string;
  name: string;
  icon: string;
  description: string;
  group: 'style' | 'phase' | 'league';
  winners: AwardWinner[];
  emptyNote?: string;
}

interface MyStats {
  accuracyPct: number | null;
  correctUpsets: number;
  rank: number | null;
}

const GROUP_ORDER: AwardResult['group'][] = ['style', 'phase', 'league'];
const GROUP_LABELS: Record<AwardResult['group'], string> = {
  style: '🎭 Playing Style',
  phase: '🏟️ Phase Champions',
  league: '🌍 League-Wide',
};

const PHASE_COLOR: Record<string, string> = Object.fromEntries(PHASES.map((p) => [`phase-${p.id}`, p.color]));
const GOLD = '#C9A73A';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: 'secondary.main', lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
        {label}
      </Typography>
    </Box>
  );
}

function AwardCard({ award }: { award: AwardResult }) {
  const accentColor = award.group === 'phase' ? (PHASE_COLOR[award.key] ?? GOLD) : GOLD;

  return (
    <Card
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderTop: `3px solid ${accentColor}`,
        borderRadius: 2,
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{award.icon}</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {award.name}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, minHeight: { sm: 32 } }}>
          {award.description}
        </Typography>

        {award.winners.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            {award.emptyNote ?? 'Not decided yet'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {award.winners.map((w) => (
              <Box key={w.userId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={w.image ?? undefined} sx={{ width: 28, height: 28, fontSize: '0.7rem', flexShrink: 0 }}>
                  {w.name[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {w.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {w.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function AwardsPage({ params }: Props) {
  const { slug } = use(params);

  const [loading, setLoading] = useState(true);
  const [leagueName, setLeagueName] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [categories, setCategories] = useState<AwardResult[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueName(leagueData.name ?? '');

        const awardsRes = await fetch(`/api/get-awards?leagueId=${leagueData.id}`);
        if (!awardsRes.ok) return;
        const data = await awardsRes.json();
        setRevealed(!!data.revealed);
        setViewerIsAdmin(!!data.isAdmin);
        setCategories(data.categories ?? []);
        setMyStats(data.myStats ?? null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  const showTeaser = !revealed && !viewerIsAdmin;
  const showAdminPreviewBanner = !revealed && viewerIsAdmin;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            textAlign: 'center',
            py: { xs: 3, sm: 4 },
            mb: 3,
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(201,167,58,0.18) 0%, rgba(201,167,58,0.04) 100%)',
            border: '1px solid rgba(201,167,58,0.25)',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            🏅 {leagueName} Awards
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Superlatives earned across the whole tournament
          </Typography>
        </Box>

        {showAdminPreviewBanner && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Only you can see this preview — flip &quot;Reveal Tournament Awards&quot; on in League Settings when you&apos;re ready to show everyone.
          </Alert>
        )}

        {showTeaser ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🏅</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Awards are still under wraps
            </Typography>
            <Typography color="text.secondary">Check back soon — the league owner will reveal them before the Final.</Typography>
          </Card>
        ) : (
          <>
            {myStats && (
              <Card
                sx={{
                  mb: 3,
                  background: 'linear-gradient(135deg, rgba(0,61,165,0.1) 0%, rgba(0,61,165,0.02) 100%)',
                  border: '1px solid rgba(0,61,165,0.25)',
                }}
              >
                <CardContent>
                  <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                    Your Tournament
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mt: 0.5 }}>
                    {myStats.rank != null && <Stat label="Rank" value={`#${myStats.rank}`} />}
                    {myStats.accuracyPct != null && <Stat label="Accuracy" value={`${myStats.accuracyPct}%`} />}
                    <Stat label="Correct Upsets" value={String(myStats.correctUpsets)} />
                  </Box>
                </CardContent>
              </Card>
            )}

            {GROUP_ORDER.map((group) => {
              const groupAwards = categories.filter((c) => c.group === group);
              if (groupAwards.length === 0) return null;
              return (
                <Box key={group} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                    {GROUP_LABELS[group]}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 2,
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                    }}
                  >
                    {groupAwards.map((award) => (
                      <AwardCard key={award.key} award={award} />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </>
        )}
      </Container>
    </Box>
  );
}
