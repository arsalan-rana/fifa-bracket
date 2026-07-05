'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { darkTheme, lightTheme } from '../lib/theme';
import { ThemeModeProvider, useThemeMode } from './theme-context';
import PostHogProvider from './components/PostHogProvider';
import type { Session } from 'next-auth';

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const theme = mode === 'light' ? lightTheme : darkTheme;
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <PostHogProvider>
        <AppRouterCacheProvider>
          <ThemeModeProvider>
            <ThemedApp>{children}</ThemedApp>
          </ThemeModeProvider>
        </AppRouterCacheProvider>
      </PostHogProvider>
    </SessionProvider>
  );
}
