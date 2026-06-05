'use client';

import { useState } from 'react';
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
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import StarsIcon from '@mui/icons-material/Stars';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavBarProps {
  leagueSlug?: string;
  leagueName?: string;
}

const NAV_ITEMS = [
  { label: 'Home', icon: <HomeIcon fontSize="small" />, href: '' },
  { label: 'Bracket', icon: <SportsSoccerIcon fontSize="small" />, href: '/bracket' },
  { label: 'Fixtures', icon: <EventNoteIcon fontSize="small" />, href: '/fixtures' },
  { label: 'Bonus', icon: <StarsIcon fontSize="small" />, href: '/bonus' },
  { label: 'Leaderboard', icon: <LeaderboardIcon fontSize="small" />, href: '/leaderboard' },
];

export default function NavBar({ leagueSlug, leagueName }: NavBarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdminUser = !!adminEmail && session?.user?.email === adminEmail;

  const basePath = leagueSlug ? `/leagues/${leagueSlug}` : '';

  const navItems = leagueSlug
    ? NAV_ITEMS.map((item) => ({ ...item, href: basePath + item.href }))
    : [{ label: 'Home', icon: <HomeIcon fontSize="small" />, href: '/' }];

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

          {/* Logo / title */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography sx={{ fontSize: '1.4rem' }}>🏆</Typography>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                WC26
              </Typography>
              {leagueName && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                  {leagueName}
                </Typography>
              )}
            </Box>
          </Link>

          {/* Desktop nav links */}
          {leagueSlug && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, ml: 2 }}>
              {navItems.slice(1).map((item) => (
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

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240, pt: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, px: 2, mb: 1 }}>
            🏆 WC26 {leagueName && `– ${leagueName}`}
          </Typography>
          <List>
            {navItems.map((item) => (
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
