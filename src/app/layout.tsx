import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/navigation';
import { Providers } from './providers';
import dynamic from 'next/dynamic';

// This comment is to add debugging to help diagnose white screen issues

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
        <p className="ml-4 text-gray-600">Loading authentication...</p>
      </div>
    )
  });

  // Get a debug ID for this session
  const debugId = Math.random().toString(36).substring(2, 8);

  return (
    <html lang="en">
      <head>
        {/* Simple debug script - no client components in server component */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('QCard Debug: Initializing with debug ID ${debugId}');
              window.QCardDebug = {
                enableDebug: function() {
                  localStorage.setItem('qcard_debug', 'true');
                  console.log('QCard debug mode enabled');
                  window.location.reload();
                },
                disableDebug: function() {
                  localStorage.removeItem('qcard_debug');
                  console.log('QCard debug mode disabled');
                  window.location.reload();
                }
              };
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          <AuthLoading>
            <Navigation />
            <main>{children}</main>
          </AuthLoading>
        </Providers>

        {/* Emergency debug button */}
        <div id="debug-button" style={{ display: 'none', position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
          <a 
            href="/auth-debug?source=emergency_button"
            style={{
              display: 'inline-block',
              background: '#ff5555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            }}
          >
            Debug Auth
          </a>
        </div>
        
        {/* Script to show debug button */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const hasDebugParam = window.location.search.includes('show_debug');
                const isDebugEnabled = localStorage.getItem('qcard_debug') === 'true';
                
                if (hasDebugParam || isDebugEnabled) {
                  document.getElementById('debug-button').style.display = 'block';
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}