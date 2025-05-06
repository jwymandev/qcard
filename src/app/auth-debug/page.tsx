'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDebugInfo() {
      try {
        setLoading(true);
        const response = await fetch('/api/auth-debug');
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setDebugInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching debug info:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDebugInfo();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
      
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded mb-6">
        <p className="font-medium">Warning: This page is for debugging purposes only</p>
        <p className="text-sm">It should be disabled in production environments.</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Client-Side Session</h2>
        <div className="bg-gray-100 p-4 rounded overflow-auto">
          <pre className="text-sm">
            {JSON.stringify({ status, session }, null, 2)}
          </pre>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded">
          <p>Error loading debug info: {error}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">Server-Side Auth Debug Info</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px]">
            <pre className="text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Troubleshooting Steps</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Check if cookies are being properly set and read</li>
          <li>Verify NEXTAUTH_URL and NEXTAUTH_SECRET environment variables</li>
          <li>Ensure the session strategy matches between server and client</li>
          <li>Check for any CORS or cookie domain issues</li>
          <li>Verify the auth provider configuration</li>
          <li>Check for client-side hydration mismatches</li>
        </ul>
      </div>
    </div>
  );
}