'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import LoginIcon from '@mui/icons-material/Login';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useRouter } from 'next/navigation';
import { TOURNAMENT } from '../data/fifa-2026';

interface League {
  id: string;
  name: string;
  slug: string;
  description?: string;
  inviteCode: string;
  _count?: { members: number };
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDesc, setNewLeagueDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') fetchLeagues();
    else if (status === 'unauthenticated') setLoading(false);
  }, [status]);

  async function fetchLeagues() {
    try {
      const res = await fetch('/api/my-leagues');
      if (res.ok) {
        const data = await res.json();
        setLeagues(data.leagues);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLeague() {
    if (!newLeagueName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/create-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeagueName, description: newLeagueDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateOpen(false);
      setNewLeagueName('');
      setNewLeagueDesc('');
      router.push(`/leagues/${data.league.slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create league');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinLeague() {
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/join-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJoinOpen(false);
      setInviteCode('');
      router.push(`/leagues/${data.league.slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join league');
    } finally {
      setSubmitting(false);
    }
  }

  const daysUntilStart = Math.max(
    0,
    Math.ceil((new Date(TOURNAMENT.startDate).getTime() - Date.now()) / 86400000)
  );

  return (
    <Box className="wc-gradient min-h-screen">
      {/* Hero */}
      <Box
        sx={{
          pt: { xs: 6, md: 10 },
          pb: { xs: 4, md: 6 },
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(0,61,165,0.6) 0%, rgba(10,15,30,0) 100%)',
        }}
      >
        <Typography variant="h1" sx={{ fontSize: { xs: '3rem', md: '5rem' }, mb: 1 }} className="trophy-glow">
          🏆
        </Typography>
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '1.6rem', md: '2.8rem' },
            fontWeight: 800,
            background: 'linear-gradient(90deg, #FFFFFF 0%, #C9A73A 50%, #FFFFFF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1,
          }}
        >
          FIFA World Cup 2026
        </Typography>
        <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 400, mb: 2 }}>
          🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico &nbsp;|&nbsp; June 11 – July 19
        </Typography>

        {daysUntilStart > 0 && (
          <Chip
            label={`⏳ ${daysUntilStart} days until kick-off`}
            sx={{
              background: 'linear-gradient(135deg, #C9A73A, #F0D060)',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.95rem',
              px: 1,
              py: 0.5,
              height: 'auto',
            }}
          />
        )}
      </Box>

      <Container maxWidth="md" sx={{ pb: 8 }}>
        {status === 'unauthenticated' && (
          <Card sx={{ mb: 4, textAlign: 'center', p: 2 }}>
            <CardContent>
              <SportsSoccerIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
                Sign in to join a league
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Predict every match, climb the leaderboard, and use chips to dominate your friends.
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<LoginIcon />}
                onClick={() => signIn('google')}
              >
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'authenticated' && (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Welcome, {session.user?.name?.split(' ')[0]} 👋
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {session.user?.email}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<GroupsIcon />}
                  onClick={() => { setError(''); setJoinOpen(true); }}
                >
                  Join League
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => { setError(''); setCreateOpen(true); }}
                >
                  New League
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress color="secondary" />
              </Box>
            ) : leagues.length === 0 ? (
              <Card sx={{ textAlign: 'center', p: 4 }}>
                <EmojiEventsIcon sx={{ fontSize: 56, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  You&apos;re not in any leagues yet
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Create a league for your friends or family, or join one with an invite code.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button variant="outlined" onClick={() => { setError(''); setJoinOpen(true); }}>
                    Join with code
                  </Button>
                  <Button variant="contained" onClick={() => { setError(''); setCreateOpen(true); }}>
                    Create a league
                  </Button>
                </Box>
              </Card>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                {leagues.map((league) => (
                  <Card key={league.id} className="card-hover">
                    <CardActionArea onClick={() => router.push(`/leagues/${league.slug}`)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {league.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={`👥 ${league._count?.members ?? 1}`}
                            sx={{ background: 'rgba(201,167,58,0.15)', color: 'secondary.main' }}
                          />
                        </Box>
                        {league.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {league.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Invite: <code style={{ color: '#C9A73A' }}>{league.inviteCode.slice(0, 8)}</code>
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 4 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Button variant="text" color="inherit" size="small" onClick={() => signOut()}>
                Sign out
              </Button>
            </Box>
          </>
        )}
      </Container>

      {/* Create league dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create a League</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="League Name"
            fullWidth
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            placeholder="e.g. The Boys, Family WC"
          />
          <TextField
            label="Description (optional)"
            fullWidth
            value={newLeagueDesc}
            onChange={(e) => setNewLeagueDesc(e.target.value)}
            multiline
            rows={2}
          />
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateLeague}
            disabled={submitting || !newLeagueName.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join league dialog */}
      <Dialog open={joinOpen} onClose={() => setJoinOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Join a League</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Invite Code"
            fullWidth
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            sx={{ mt: 1 }}
            placeholder="Paste the invite code"
          />
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinOpen(false)} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleJoinLeague}
            disabled={submitting || !inviteCode.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : 'Join'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
