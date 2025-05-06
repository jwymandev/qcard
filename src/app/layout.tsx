import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/navigation';
import { Providers } from './providers';
import dynamic from 'next/dynamic';

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
  // Load AuthLoading component dynamically to ensure it only runs on client
  const AuthLoading = dynamic(() => import('@/components/AuthLoading'), {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  });

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AuthLoading>
            <Navigation />
            <main>{children}</main>
          </AuthLoading>
        </Providers>
      </body>
    </html>
  );
}