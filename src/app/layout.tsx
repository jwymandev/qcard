import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/navigation';
import { Providers } from './providers';

// This comment is to force a refresh

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
      <body className={inter.className}>
        <Providers>
          <Navigation />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}