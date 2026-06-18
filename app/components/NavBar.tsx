'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import StarsIcon from '@mui/icons-material/Stars';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeMode } from '../theme-context';

interface NavBarProps {
  leagueSlug?: string;
  leagueName?: string;
}

interface LeagueSummary {
  id: string;
  name: string;
  slug: string;
  myRank: { rank: number; totalPoints: number } | null;
}

const MAIN_NAV_ITEMS = [
  { label: 'Bracket', icon: <SportsSoccerIcon fontSize="small" />, href: '/bracket' },
  { label: 'Fixtures', icon: <EventNoteIcon fontSize="small" />, href: '/fixtures' },
  { label: 'Bonus', icon: <StarsIcon fontSize="small" />, href: '/bonus' },
  { label: 'Leaderboard', icon: <LeaderboardIcon fontSize="small" />, href: '/leaderboard' },
];

const BOTTOM_NAV_ITEMS = [
  { label: 'Notifications', icon: <NotificationsIcon fontSize="small" />, href: '/notifications' },
];

const PAGE_LABELS: Record<string, string> = {
  bracket: 'Bracket',
  fixtures: 'Fixtures',
  bonus: 'Bonus',
  leaderboard: 'Leaderboard',
  notifications: 'Notifications',
  admin: 'Admin',
};

export default function NavBar({ leagueSlug, leagueName }: NavBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mode, toggle } = useThemeMode();
  const [myLeagues, setMyLeagues] = useState<LeagueSummary[]>([]);
  const [switcherAnchor, setSwitcherAnchor] = useState<null | HTMLElement>(null);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdminUser = !!adminEmail && session?.user?.email === adminEmail;

  const basePath = leagueSlug ? `/leagues/${leagueSlug}` : '';

  // Fetch user's leagues for the switcher
  useEffect(() => {
    if (!session || !leagueSlug) return;
    fetch('/api/my-leagues')
      .then((r) => r.json())
      .then((d) => {
        if (d.leagues) setMyLeagues(d.leagues.filter((l: LeagueSummary & { isMember?: boolean }) => l.isMember !== false));
      })
      .catch(() => {});
  }, [session, leagueSlug]);

  function switchLeague(newSlug: string) {
    setSwitcherAnchor(null);
    setDrawerOpen(false);
    if (newSlug === leagueSlug) return;
    const safePath = pathname ?? '';
    // Swap the slug in the current path so user lands on the same view
    const newPath = safePath.includes(`/leagues/${leagueSlug}`)
      ? safePath.replace(`/leagues/${leagueSlug}`, `/leagues/${newSlug}`)
      : `/leagues/${newSlug}`;
    router.push(newPath);
  }

  const hasMultipleLeagues = myLeagues.length > 1;

  // Build breadcrumb trail from current path
  const safePath = pathname ?? '';
  const segments = safePath.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [{ label: 'Home', href: '/' }];
  if (safePath.startsWith('/admin')) {
    breadcrumbs.push({ label: 'Admin', href: '/admin' });
  } else if (leagueSlug) {
    breadcrumbs.push({ label: leagueName ?? leagueSlug, href: `/leagues/${leagueSlug}` });
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment !== leagueSlug && PAGE_LABELS[lastSegment]) {
      breadcrumbs.push({ label: PAGE_LABELS[lastSegment], href: `${basePath}/${lastSegment}` });
    }
  } else if (safePath.startsWith('/join/')) {
    breadcrumbs.push({ label: 'Join League', href: safePath });
  }
  const showBreadcrumbs = breadcrumbs.length > 1;

  const mainNavItems = leagueSlug
    ? MAIN_NAV_ITEMS.map((item) => ({ ...item, href: basePath + item.href }))
    : [];

  const bottomNavItems = leagueSlug
    ? BOTTOM_NAV_ITEMS.map((item) => ({ ...item, href: basePath + item.href }))
    : [];

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, #001F6B 0%, #003DA5 50%, #001F6B 100%)',
          borderBottom: '1px solid rgba(201,167,58,0.3)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {/* Mobile menu */}
          {leagueSlug && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography sx={{ fontSize: '1.4rem' }}>🏆</Typography>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                WC26
              </Typography>
            </Box>
          </Link>

          {/* League switcher — shown when inside a league */}
          {leagueSlug && leagueName && (
            <Box
              onClick={hasMultipleLeagues ? (e) => setSwitcherAnchor(e.currentTarget as HTMLElement) : undefined}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 0.25,
                ml: 0.5,
                px: 1,
                py: 0.4,
                borderRadius: 1.5,
                cursor: hasMultipleLeagues ? 'pointer' : 'default',
                border: '1px solid',
                borderColor: hasMultipleLeagues ? 'rgba(201,167,58,0.35)' : 'transparent',
                bgcolor: hasMultipleLeagues ? 'rgba(201,167,58,0.08)' : 'transparent',
                '&:hover': hasMultipleLeagues ? { bgcolor: 'rgba(201,167,58,0.16)', borderColor: 'rgba(201,167,58,0.6)' } : {},
                transition: 'all 0.15s',
              }}
            >
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, lineHeight: 1 }}>
                {leagueName}
              </Typography>
              {hasMultipleLeagues && (
                <KeyboardArrowDownIcon sx={{ fontSize: 15, color: 'rgba(201,167,58,0.8)', transition: 'transform 0.15s', transform: switcherAnchor ? 'rotate(180deg)' : 'none' }} />
              )}
            </Box>
          )}

          {/* Switcher dropdown */}
          <Menu
            anchorEl={switcherAnchor}
            open={Boolean(switcherAnchor)}
            onClose={() => setSwitcherAnchor(null)}
            slotProps={{ paper: { sx: { mt: 0.5, minWidth: 200, bgcolor: 'background.paper' } } }}
          >
            <Typography variant="caption" sx={{ display: 'block', px: 2, pt: 1, pb: 0.5, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
              Switch League
            </Typography>
            {myLeagues.map((l) => {
              const isCurrent = l.slug === leagueSlug;
              return (
                <MenuItem
                  key={l.slug}
                  onClick={() => switchLeague(l.slug)}
                  selected={isCurrent}
                  sx={{ gap: 1.5, py: 1 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'secondary.main' : 'text.primary' }}>
                      {l.name}
                    </Typography>
                    {l.myRank && (
                      <Typography variant="caption" color="text.disabled">
                        Rank #{l.myRank.rank} · {l.myRank.totalPoints} pts
                      </Typography>
                    )}
                  </Box>
                  {isCurrent && <CheckIcon sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />}
                </MenuItem>
              );
            })}
          </Menu>

          {/* Desktop nav links */}
          {leagueSlug && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, ml: 1 }}>
              {[...mainNavItems, ...bottomNavItems].map((item) => (
                <Button
                  key={item.label}
                  color="inherit"
                  startIcon={item.icon}
                  href={item.href}
                  component={Link}
                  sx={{
                    borderRadius: 2,
                    px: 1.5,
                    fontWeight: pathname === item.href ? 700 : 400,
                    background: pathname === item.href ? 'rgba(201,167,58,0.2)' : 'transparent',
                    color: pathname === item.href ? '#C9A73A' : 'inherit',
                    '&:hover': { background: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Admin link (desktop) */}
          {isAdminUser && (
            <Button
              color="inherit"
              startIcon={<AdminPanelSettingsIcon fontSize="small" />}
              href="/admin"
              component={Link}
              sx={{
                borderRadius: 2,
                px: 1.5,
                fontWeight: pathname === '/admin' ? 700 : 400,
                background: pathname === '/admin' ? 'rgba(201,167,58,0.2)' : 'transparent',
                color: pathname === '/admin' ? '#C9A73A' : 'rgba(255,255,255,0.8)',
                '&:hover': { background: 'rgba(255,255,255,0.08)' },
                display: { xs: 'none', md: 'flex' },
              }}
            >
              Admin
            </Button>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Theme toggle */}
          <IconButton onClick={toggle} color="inherit" size="small" sx={{ ml: 1 }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>

          {/* User avatar */}
          {session?.user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={session.user.image ?? undefined}
                alt={session.user.name ?? 'User'}
                sx={{ width: 32, height: 32, cursor: 'pointer' }}
                onClick={() => signOut({ callbackUrl: '/' })}
              />
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}
              >
                {session.user.name?.split(' ')[0]}
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Breadcrumbs */}
      {showBreadcrumbs && (
        <Box sx={{ background: 'rgba(0,20,60,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)', px: 2, py: 0.75 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="inherit" sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }} />}
            sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
          >
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return isLast ? (
                <Typography key={crumb.href} variant="caption" sx={{ color: '#C9A73A', fontWeight: 700 }}>
                  {crumb.label}
                </Typography>
              ) : (
                <Link key={crumb.href} href={crumb.href} style={{ textDecoration: 'none' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'rgba(255,255,255,0.85)' } }}>
                    {crumb.label}
                  </Typography>
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240, pt: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, px: 2, mb: 0.5 }}>
            🏆 WC26
          </Typography>

          {/* League switcher in drawer */}
          {hasMultipleLeagues && (
            <Box sx={{ px: 2, mb: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.6rem' }}>
                Switch League
              </Typography>
              {myLeagues.map((l) => {
                const isCurrent = l.slug === leagueSlug;
                return (
                  <Box
                    key={l.slug}
                    onClick={() => switchLeague(l.slug)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1,
                      py: 0.75,
                      mt: 0.5,
                      borderRadius: 1.5,
                      cursor: isCurrent ? 'default' : 'pointer',
                      bgcolor: isCurrent ? 'rgba(201,167,58,0.12)' : 'transparent',
                      border: '1px solid',
                      borderColor: isCurrent ? 'rgba(201,167,58,0.4)' : 'divider',
                      '&:hover': !isCurrent ? { bgcolor: 'action.hover' } : {},
                      transition: 'all 0.15s',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'secondary.main' : 'text.primary', lineHeight: 1.2 }}>
                        {l.name}
                      </Typography>
                      {l.myRank && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                          #{l.myRank.rank} · {l.myRank.totalPoints} pts
                        </Typography>
                      )}
                    </Box>
                    {isCurrent && <CheckIcon sx={{ fontSize: 14, color: 'secondary.main', flexShrink: 0 }} />}
                  </Box>
                );
              })}
            </Box>
          )}

          {!hasMultipleLeagues && leagueName && (
            <Typography variant="body2" sx={{ px: 2, mb: 1, color: 'text.secondary', fontWeight: 600 }}>
              {leagueName}
            </Typography>
          )}

          <Divider sx={{ mb: 0.5 }} />

          <List>
            {/* Leagues list link */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => { setDrawerOpen(false); router.push('/'); }}
                selected={pathname === '/'}
              >
                <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  <FormatListBulletedIcon fontSize="small" />
                </Box>
                <ListItemText primary="My Leagues" />
              </ListItemButton>
            </ListItem>
            {/* League home */}
            {leagueSlug && (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => { setDrawerOpen(false); router.push(basePath); }}
                  selected={pathname === basePath}
                >
                  <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                    <HomeIcon fontSize="small" />
                  </Box>
                  <ListItemText primary="Home" />
                </ListItemButton>
              </ListItem>
            )}
            {/* Main nav items */}
            {mainNavItems.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  onClick={() => { setDrawerOpen(false); router.push(item.href); }}
                  selected={pathname === item.href}
                >
                  <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box sx={{ flexGrow: 1 }} />

          <Divider />
          <List>
            {bottomNavItems.map((item) => (
              <ListItem key={item.label} disablePadding>
                <ListItemButton
                  onClick={() => { setDrawerOpen(false); router.push(item.href); }}
                  selected={pathname === item.href}
                >
                  <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
            {isAdminUser && (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => { setDrawerOpen(false); router.push('/admin'); }}
                  selected={pathname === '/admin'}
                >
                  <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                    <AdminPanelSettingsIcon fontSize="small" />
                  </Box>
                  <ListItemText primary="Admin" />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton onClick={() => signOut({ callbackUrl: '/' })}>
                <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  <LogoutIcon fontSize="small" />
                </Box>
                <ListItemText primary="Sign out" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
