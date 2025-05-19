'use client';
 
import { useEffect } from 'react';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Global error caught:', error);
  }, [error]);
 
  return (
    <html>
      <body>
        <div style={{
          padding: '20px',
          margin: '20px',
          backgroundColor: '#fee',
          border: '2px solid #f88',
          borderRadius: '8px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: '#c33', marginTop: 0 }}>Something went wrong!</h2>
          <p>An unexpected error occurred in the application:</p>
          <div style={{
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            overflow: 'auto',
            margin: '12px 0'
          }}>
            <strong>{error.message}</strong>
            {error.digest && <p style={{ fontFamily: 'monospace', fontSize: '12px' }}>Digest: {error.digest}</p>}
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#4a88e5',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            
            <a
              href="/auth-debug"
              style={{
                backgroundColor: '#444',
                color: 'white',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                display: 'inline-block'
              }}
            >
              Debug Auth
            </a>
            
            <button
              onClick={() => window.location.href = '/'}
              style={{
                backgroundColor: 'white',
                color: '#333',
                border: '1px solid #ccc',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}