'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import GroupsIcon from '@mui/icons-material/Groups';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

interface LeagueInfo {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
  _count: { members: number };
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const code = (params?.code as string) ?? '';

  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLeague() {
      try {
        const res = await fetch(`/api/league-by-code?code=${encodeURIComponent(code)}`);
        if (res.status === 404) {
          setNotFound(true);
        } else if (res.ok) {
          const data = await res.json();
          setLeague(data.league);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (code) fetchLeague();
  }, [code]);

  async function handleJoin() {
    if (status === 'unauthenticated') {
      signIn('google', { callbackUrl: window.location.href });
      return;
    }
    setJoining(true);
    setError('');
    try {
      const res = await fetch('/api/join-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });
      const data = await res.json();
      if (res.status === 400 && data.error === 'Already a member') {
        router.push(`/leagues/${data.league?.slug ?? ''}`);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      router.push(`/leagues/${data.league.slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join league');
      setJoining(false);
    }
  }

  return (
    <Box sx={{ background: '#0A0F1E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Container maxWidth="sm">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : notFound ? (
          <Card sx={{ textAlign: 'center', p: 4 }}>
            <CardContent>
              <Typography variant="h4" sx={{ mb: 2 }}>🔍</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                League not found
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                This invite link is invalid or the league no longer exists.
              </Typography>
              <Button
                variant="contained"
                startIcon={<HomeIcon />}
                onClick={() => router.push('/')}
              >
                Back to home
              </Button>
            </CardContent>
          </Card>
        ) : league ? (
          <Card sx={{ textAlign: 'center', p: 4 }}>
            <CardContent>
              <SportsSoccerIcon sx={{ fontSize: 56, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                {league.name}
              </Typography>
              <Chip
                icon={<GroupsIcon />}
                label={`${league._count.members} member${league._count.members !== 1 ? 's' : ''}`}
                sx={{ mb: 3, background: 'rgba(201,167,58,0.15)', color: '#C9A73A' }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={handleJoin}
                  disabled={joining || status === 'loading'}
                  startIcon={
                    joining || status === 'loading'
                      ? <CircularProgress size={18} />
                      : status === 'unauthenticated'
                      ? <LoginIcon />
                      : <GroupsIcon />
                  }
                  sx={{ minWidth: 180 }}
                >
                  {joining ? 'Joining...' : status === 'unauthenticated' ? 'Sign in to join' : 'Join League'}
                </Button>
                {error && (
                  <Typography color="error" variant="body2">{error}</Typography>
                )}
                <Button
                  variant="text"
                  color="inherit"
                  size="small"
                  onClick={() => router.push('/')}
                >
                  Back to home
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : null}
      </Container>
    </Box>
  );
}
