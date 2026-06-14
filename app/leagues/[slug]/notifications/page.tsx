'use client';

import { use, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useRouter } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  taunt_received: '⚡',
  gained_lead: '🏆',
  lost_lead: '😤',
  rank_up: '📈',
  rank_down: '📉',
  score_correct: '🎯',
};

function groupByDay(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const todayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() >= todayTs) {
      todayItems.push(n);
    } else {
      earlierItems.push(n);
    }
  }

  return { todayItems, earlierItems };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState('');
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const leagueRes = await fetch(`/api/league-by-slug?slug=${slug}`);
        if (!leagueRes.ok) return;
        const leagueData = await leagueRes.json();
        setLeagueId(leagueData.id);

        const res = await fetch(`/api/notifications?leagueId=${leagueData.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function markAllRead() {
    if (!leagueId) return;
    setMarkingRead(true);
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } finally {
      setMarkingRead(false);
    }
  }

  const { todayItems, earlierItems } = groupByDay(notifications);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  function NotifItem({ n }: { n: Notification }) {
    const isLeaderboard = ['gained_lead', 'lost_lead', 'rank_up', 'rank_down', 'taunt_received', 'score_correct'].includes(n.type);
    return (
      <Box
        onClick={() => isLeaderboard && router.push(`/leagues/${slug}/leaderboard`)}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          px: 2,
          py: 1.5,
          cursor: isLeaderboard ? 'pointer' : 'default',
          bgcolor: !n.readAt ? 'rgba(0,61,165,0.08)' : 'transparent',
          '&:hover': isLeaderboard ? { bgcolor: 'rgba(255,255,255,0.04)' } : {},
          transition: 'background 0.15s',
        }}
      >
        <Typography sx={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0, mt: 0.25 }}>
          {TYPE_ICONS[n.type] ?? '🔔'}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: !n.readAt ? 600 : 400 }}>
            {n.message}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {timeAgo(n.createdAt)}
          </Typography>
        </Box>
        {!n.readAt && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              flexShrink: 0,
              mt: 0.75,
            }}
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            🔔 Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={markAllRead}
              disabled={markingRead}
              sx={{ fontSize: '0.75rem' }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {notifications.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No notifications yet.</Typography>
          </Card>
        ) : (
          <Card sx={{ overflow: 'hidden' }}>
            {todayItems.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', px: 2, pt: 1.5, pb: 0.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}
                >
                  Today
                </Typography>
                {todayItems.map((n, i) => (
                  <Box key={n.id}>
                    <NotifItem n={n} />
                    {i < todayItems.length - 1 && <Divider />}
                  </Box>
                ))}
              </>
            )}

            {earlierItems.length > 0 && (
              <>
                {todayItems.length > 0 && <Divider sx={{ my: 0.5 }} />}
                <Typography
                  variant="caption"
                  sx={{ display: 'block', px: 2, pt: 1.5, pb: 0.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}
                >
                  Earlier
                </Typography>
                {earlierItems.map((n, i) => (
                  <Box key={n.id}>
                    <NotifItem n={n} />
                    {i < earlierItems.length - 1 && <Divider />}
                  </Box>
                ))}
              </>
            )}
          </Card>
        )}
      </Container>
    </Box>
  );
}
