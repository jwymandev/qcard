'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function AuthDebug() {
  const { data: session, status } = useSession();
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Fetch auth status from API
  useEffect(() => {
    async function checkAuthApi() {
      try {
        const response = await fetch('/api/auth/auth-status');
        if (response.ok) {
          const data = await response.json();
          setApiStatus(data);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    }
    
    checkAuthApi();
  }, []);
  
  if (status === 'loading' || !apiStatus) {
    return null; // Hide while loading
  }
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 right-0 bg-gray-800 text-white p-2 rounded-tl-md opacity-75 hover:opacity-100 transition-opacity text-xs" style={{ zIndex: 9999, maxWidth: '50vw', maxHeight: expanded ? '80vh' : '30px', overflow: 'auto' }}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span>Auth Debug: {status}</span>
        <span>{expanded ? '▼' : '▲'}</span>
      </div>
      
      {expanded && (
        <div className="mt-2 space-y-2">
          <div>
            <strong>Client Status:</strong> {status}
            <br />
            <strong>Session Exists:</strong> {session ? 'Yes' : 'No'}
            {session?.user && (
              <div>
                <strong>User:</strong> {session.user.email}
                <br />
                <strong>Tenant:</strong> {session.user.tenantType || 'Unknown'}
              </div>
            )}
          </div>
          
          <div>
            <strong>API Status:</strong>
            <br />
            <strong>Cookie Header:</strong> {apiStatus.cookies.cookieHeaderExists ? 'Present' : 'Missing'}
            <br />
            <strong>Session Cookie:</strong> {apiStatus.cookies.hasSessionCookie ? 'Present' : 'Missing'}
            <br />
            <strong>Token:</strong> {apiStatus.token.exists ? 'Valid' : 'Invalid'}
          </div>
          
          <div className="text-xs overflow-auto max-h-40 bg-gray-700 p-1 rounded">
            <pre>{JSON.stringify(apiStatus, null, 2)}</pre>
          </div>
          
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/auth-status');
                if (response.ok) {
                  const data = await response.json();
                  setApiStatus(data);
                  alert('Auth status refreshed!');
                }
              } catch (error) {
                console.error('Error refreshing auth status:', error);
              }
            }}
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}