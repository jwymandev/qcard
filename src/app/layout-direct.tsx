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
          {/* Render without AuthLoading wrapper to avoid blocking */}
          <Navigation />
          <main>{children}</main>
        </Providers>

        {/* Emergency access button */}
        <div id="emergency-button" style={{ display: 'none', position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
          <a 
            href="/?bypass_auth=true"
            style={{
              display: 'inline-block',
              background: '#ff5555',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
              marginRight: '8px'
            }}
          >
            Emergency Access
          </a>
          <a 
            href="/auth-debug?source=emergency_button"
            style={{
              display: 'inline-block',
              background: '#5555ff',
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
        
        {/* Detect loading time and show emergency button */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Show debug button based on params or localStorage
                const hasDebugParam = window.location.search.includes('show_debug');
                const isDebugEnabled = localStorage.getItem('qcard_debug') === 'true';
                const hasEmergencyParam = window.location.search.includes('bypass_auth');
                
                if (hasDebugParam || isDebugEnabled || hasEmergencyParam) {
                  document.getElementById('emergency-button').style.display = 'block';
                }
                
                // Track loading time and show emergency button after 4 seconds
                let loadStartTime = Date.now();
                let loadingInterval = setInterval(() => {
                  const loadingTime = Math.floor((Date.now() - loadStartTime) / 1000);
                  if (loadingTime > 4) {
                    document.getElementById('emergency-button').style.display = 'block';
                    clearInterval(loadingInterval);
                  }
                }, 1000);
                
                // Clear interval when page is fully loaded
                window.addEventListener('load', () => {
                  clearInterval(loadingInterval);
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}