import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026 | Bracket Predictor',
  description: 'Predict every match of the FIFA World Cup 2026 with your friends and family. Use chips, climb the leaderboard, win the prize pool.',
  openGraph: {
    title: 'FIFA World Cup 2026 | Bracket Predictor',
    description: 'Predict every match with your friends and family. Use chips, climb the leaderboard, win the prize pool.',
    siteName: 'WC26 Bracket',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIFA World Cup 2026 | Bracket Predictor',
    description: 'Predict every match with your friends and family.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <Providers session={session}>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
