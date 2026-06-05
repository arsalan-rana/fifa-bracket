'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import StarsIcon from '@mui/icons-material/Stars';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { PHASES, getCurrentPhase } from '../../../data/fifa-2026';

interface LeagueDashboardProps {
  league: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    inviteCode: string;
    ownerId: string;
    isPrizePool: boolean;
    buyInAmount?: number | string | null;
    buyInCurrency: string;
    members: {
      userId: string;
      isVerified: boolean;
      user: { name: string | null; email: string; image: string | null };
    }[];
    leaderboard: {
      rank: number;
      totalPoints: number;
      user: { name: string | null; email: string; image: string | null };
    }[];
    activityLogs: {
      id: string;
      eventType: string;
      details: string;
      createdAt: string;
      userId: string | null;
    }[];
  };
  currentUserEmail: string;
  isAdmin: boolean;
  currentUserId: string;
}

export default function LeagueDashboard({ league, currentUserEmail, isAdmin, currentUserId }: LeagueDashboardProps) {
  const router = useRouter();
  const currentMembership = league.members.find((m) => m.userId === currentUserId);
  const isCurrentUserVerified = currentMembership?.isVerified !== false;
  const isOwnerOrAdmin = currentUserId === league.ownerId || isAdmin;
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [kicking, setKicking] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const currentPhase = getCurrentPhase();
  const phaseConfig = PHASES.find((p) => p.id === currentPhase);
  const deadline = phaseConfig ? new Date(phaseConfig.deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : 0;

  function copyInviteCode() {
    navigator.clipboard.writeText(league.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyJoinUrl() {
    const url = `${window.location.origin}/join/${league.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function refreshLeaderboard() {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await fetch('/api/refresh-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefreshMsg(`Updated ${data.entries} entries`);
        router.refresh();
      } else {
        setRefreshMsg(data.error || 'Error');
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleVerify(targetUserId: string, targetName: string) {
    if (!window.confirm(`Mark ${targetName} as verified (paid)?`)) return;
    setVerifying(targetUserId);
    try {
      const res = await fetch('/api/verify-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id, targetUserId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to verify member');
      }
    } finally {
      setVerifying(null);
    }
  }

  async function handleKick(targetUserId: string, targetName: string) {
    if (!window.confirm(`Remove ${targetName} from this league?`)) return;
    setKicking(targetUserId);
    try {
      const res = await fetch('/api/kick-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id, targetUserId }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to kick member');
      }
    } finally {
      setKicking(null);
    }
  }

  function parseActivity(log: { eventType: string; details: string }) {
    try {
      const d = JSON.parse(log.details);
      switch (log.eventType) {
        case 'predictions_submitted': return `${d.userName} submitted ${d.count} picks for ${d.phaseName}`;
        case 'member_joined': return `${d.userName} joined the league`;
        case 'league_created': return `League "${d.leagueName}" was created`;
        case 'leaderboard_refreshed': return `Leaderboard updated (${d.count} players)`;
        case 'member_kicked': return `A member was removed from the league`;
        case 'member_verified': return `${d.verifiedByName} verified ${d.verifiedUserName}`;
        default: return log.eventType;
      }
    } catch {
      return log.eventType;
    }
  }

  return (
    <Box sx={{ background: '#0A0F1E', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* League header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }} gutterBottom>
            {league.name}
          </Typography>
          {league.description && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>{league.description}</Typography>
          )}

          {/* Invite code */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Invite code:</Typography>
            <Chip
              label={league.inviteCode.slice(0, 12)}
              size="small"
              sx={{ fontFamily: 'monospace', background: 'rgba(201,167,58,0.1)', color: '#C9A73A', fontWeight: 700 }}
            />
            <Button
              size="small"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={copyInviteCode}
              variant={copied ? 'contained' : 'outlined'}
              color="secondary"
              sx={{ borderRadius: 2 }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </Box>

          {/* Shareable join URL */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">Join link:</Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', color: '#C9A73A', wordBreak: 'break-all' }}
            >
              {typeof window !== 'undefined' ? `${window.location.origin}/join/${league.inviteCode}` : `/join/${league.inviteCode}`}
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon fontSize="small" />}
              onClick={copyJoinUrl}
              variant={copiedUrl ? 'contained' : 'outlined'}
              color="secondary"
              sx={{ borderRadius: 2 }}
            >
              {copiedUrl ? 'Copied!' : 'Copy URL'}
            </Button>
          </Box>
        </Box>

        {/* Prize pool unverified banner */}
        {league.isPrizePool && !isCurrentUserVerified && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Your buy-in of ${Number(league.buyInAmount).toFixed(2)} {league.buyInCurrency} is pending.
            E-transfer to{' '}
            <strong>
              {league.members.find((m) => m.userId === league.ownerId)?.user.name ??
                league.members.find((m) => m.userId === league.ownerId)?.user.email ??
                'the league owner'}
            </strong>{' '}
            and ask them to verify you to submit picks.
          </Alert>
        )}

        {/* Phase deadline alert */}
        {phaseConfig && daysLeft >= 0 && (
          <Alert
            severity={daysLeft <= 1 ? 'error' : 'info'}
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<span>{phaseConfig.icon}</span>}
          >
            <strong>{phaseConfig.name} deadline:</strong>{' '}
            {daysLeft === 0
              ? 'Today!'
              : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
            {' — '}
            {new Date(phaseConfig.deadline).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
          {/* Left column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Quick actions */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<SportsSoccerIcon />}
                    onClick={() => router.push(`/leagues/${league.slug}/bracket`)}
                    disabled={!isCurrentUserVerified}
                    title={!isCurrentUserVerified ? 'Verify your buy-in payment to submit picks' : undefined}
                    sx={{ py: 1.5 }}
                  >
                    Submit Picks
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<LeaderboardIcon />}
                    onClick={() => router.push(`/leagues/${league.slug}/leaderboard`)}
                    sx={{ py: 1.5 }}
                  >
                    Leaderboard
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<StarsIcon />}
                    color="secondary"
                    onClick={() => router.push(`/leagues/${league.slug}/bonus`)}
                    disabled={!isCurrentUserVerified}
                    title={!isCurrentUserVerified ? 'Verify your buy-in payment to submit bonus picks' : undefined}
                    sx={{ py: 1.5 }}
                  >
                    Bonus Picks
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => router.push(`/leagues/${league.slug}/fixtures`)}
                    sx={{ py: 1.5 }}
                  >
                    View Fixtures
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Top leaderboard preview */}
            {league.leaderboard.length > 0 && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      <EmojiEventsIcon sx={{ mr: 1, color: 'secondary.main', verticalAlign: 'middle' }} />
                      Top 5
                    </Typography>
                    <Button size="small" onClick={() => router.push(`/leagues/${league.slug}/leaderboard`)}>
                      View all
                    </Button>
                  </Box>
                  {league.leaderboard.map((entry, idx) => (
                    <Box
                      key={entry.user.email}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                        borderBottom: idx < league.leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      }}
                    >
                      <Typography
                        sx={{
                          width: 28,
                          fontWeight: 800,
                          color: idx === 0 ? '#C9A73A' : idx === 1 ? '#9CA3AF' : idx === 2 ? '#CD7F32' : 'text.secondary',
                        }}
                      >
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                      </Typography>
                      <Avatar src={entry.user.image ?? undefined} sx={{ width: 28, height: 28 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                        {entry.user.name ?? entry.user.email}
                        {entry.user.email === currentUserEmail && (
                          <Chip label="you" size="small" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                        )}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} color="secondary.main">
                        {entry.totalPoints} pts
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Activity log */}
            {league.activityLogs.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                    Recent Activity
                  </Typography>
                  {league.activityLogs.map((log) => (
                    <Box
                      key={log.id}
                      sx={{ py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.06)', '&:last-child': { borderBottom: 'none' } }}
                    >
                      <Typography variant="body2">{parseActivity(log)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(log.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Right column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Members */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                  Members ({league.members.length})
                </Typography>
                {league.members.map((m) => {
                  const canKick =
                    isOwnerOrAdmin &&
                    m.userId !== currentUserId &&
                    m.userId !== league.ownerId;
                  const canVerify =
                    isOwnerOrAdmin &&
                    league.isPrizePool &&
                    !m.isVerified;
                  return (
                    <Box key={m.user.email} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, flexWrap: 'wrap' }}>
                      <Avatar src={m.user.image ?? undefined} sx={{ width: 28, height: 28 }} />
                      <Typography variant="body2" sx={{ fontWeight: m.user.email === currentUserEmail ? 700 : 400, flexGrow: 1 }}>
                        {m.user.name ?? m.user.email}
                        {m.user.email === currentUserEmail && ' (you)'}
                      </Typography>
                      {isOwnerOrAdmin && league.isPrizePool && !m.isVerified && (
                        <Chip
                          label="Unverified"
                          size="small"
                          color="warning"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                      {canVerify && (
                        <Button
                          size="small"
                          color="success"
                          variant="outlined"
                          disabled={verifying === m.userId}
                          onClick={() => handleVerify(m.userId, m.user.name ?? m.user.email)}
                          sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.7rem', lineHeight: 1 }}
                          title={`Mark ${m.user.name ?? m.user.email} as paid/verified`}
                        >
                          {verifying === m.userId ? '...' : 'Verify'}
                        </Button>
                      )}
                      {canKick && (
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          disabled={kicking === m.userId}
                          onClick={() => handleKick(m.userId, m.user.name ?? m.user.email)}
                          sx={{ minWidth: 0, px: 0.5, py: 0.25, fontSize: '1rem', lineHeight: 1 }}
                          title={`Remove ${m.user.name ?? m.user.email}`}
                        >
                          {kicking === m.userId ? '...' : '×'}
                        </Button>
                      )}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>

            {/* Phases */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
                  Phases
                </Typography>
                {PHASES.map((phase) => {
                  const isActive = phase.id === currentPhase;
                  const isPast = new Date() > new Date(phase.deadline);
                  return (
                    <Box
                      key={phase.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 0.75,
                        gap: 1,
                        opacity: isPast && !isActive ? 0.5 : 1,
                      }}
                    >
                      <Typography>{phase.icon}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: isActive ? 700 : 400, flexGrow: 1 }}>
                        {phase.name}
                      </Typography>
                      {isActive && (
                        <Chip label="Active" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>

            {/* Admin controls */}
            {isAdmin && (
              <Card sx={{ border: '1px solid rgba(201,167,58,0.3)' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom color="secondary">
                    Admin Controls
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={refreshLeaderboard}
                    disabled={refreshing}
                    sx={{ mb: 1 }}
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh Leaderboard'}
                  </Button>
                  {refreshMsg && (
                    <Typography variant="caption" color="success.main">{refreshMsg}</Typography>
                  )}
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    component={Link}
                    href="/admin"
                    sx={{ mt: 1 }}
                  >
                    Enter Results
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
