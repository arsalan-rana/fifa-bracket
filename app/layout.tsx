import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../lib/auth';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'FIFA World Cup 2026 | Bracket',
  description: 'Predict every match of the FIFA World Cup 2026 with your friends and family.',
  icons: { icon: '/favicon.ico' },
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
      </body>
    </html>
  );
}
