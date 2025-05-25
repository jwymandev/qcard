import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/navigation';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QCard - Casting Platform',
  description: 'Connect studios with talent for video and movie production',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Removed problematic inline scripts that cause hydration issues */}
      </head>
      <body className={inter.className}>
        <Providers>
          {/* Render without AuthLoading wrapper to avoid blocking */}
          <Navigation />
          <main>{children}</main>
        </Providers>

        {/* Removed emergency button and inline scripts that cause hydration issues */}
      </body>
    </html>
  );
}