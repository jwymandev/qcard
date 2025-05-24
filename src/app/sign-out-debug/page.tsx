'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function SignOutDebugPage() {
  const { data: session, status } = useSession();
  const [signOutAttempted, setSignOutAttempted] = useState(false);
  const [manualSignOutAttempted, setManualSignOutAttempted] = useState(false);
  const [cookies, setCookies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get all cookies on component mount
  useEffect(() => {
    const allCookies = document.cookie.split(';').map(cookie => cookie.trim());
    setCookies(allCookies);
  }, []);

  // Handle standard NextAuth signOut
  const handleSignOut = async () => {
    try {
      setSignOutAttempted(true);
      await signOut({ redirect: false });
      
      // After signOut, check if session is still active
      setTimeout(() => {
        setCookies(document.cookie.split(';').map(cookie => cookie.trim()));
      }, 500);
    } catch (err) {
      console.error('Error during sign out:', err);
      setError(`SignOut error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle manual cookie clearing
  const handleManualSignOut = async () => {
    try {
      setManualSignOutAttempted(true);
      const response = await fetch('/api/auth/signout-fix');
      const data = await response.json();
      console.log('Manual sign out response:', data);
      
      setTimeout(() => {
        setCookies(document.cookie.split(';').map(cookie => cookie.trim()));
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Error during manual sign out:', err);
      setError(`Manual SignOut error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Sign Out Debug Page</h1>
      
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Signed in:</strong> {status === 'authenticated' ? 'Yes' : 'No'}</p>
        {session && (
          <div className="mt-2">
            <p><strong>User:</strong> {session.user?.name || session.user?.email || 'Unknown'}</p>
            <p><strong>Role:</strong> {session.user?.role || 'Not specified'}</p>
          </div>
        )}
      </div>
      
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleSignOut}
          disabled={signOutAttempted && status === 'unauthenticated'}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {signOutAttempted ? (status === 'unauthenticated' ? 'Signed Out' : 'Try Again') : 'Standard Sign Out'}
        </button>
        
        <button
          onClick={handleManualSignOut}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          {manualSignOutAttempted ? 'Try Again' : 'Force Sign Out (Clear Cookies)'}
        </button>
        
        <Link href="/" className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Go Home
        </Link>
      </div>
      
      {error && (
        <div className="mb-6 p-4 border rounded bg-red-50 text-red-700">
          <h2 className="font-semibold">Error</h2>
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cookies ({cookies.length})</h2>
        <div className="p-4 border rounded bg-gray-50 max-h-64 overflow-auto">
          {cookies.length > 0 ? (
            <ul className="list-disc pl-5">
              {cookies.map((cookie, index) => (
                <li key={index} className="mb-1">
                  {cookie}
                </li>
              ))}
            </ul>
          ) : (
            <p>No cookies found.</p>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-500">
        <h3 className="font-medium">How to fix sign out issues:</h3>
        <ol className="list-decimal pl-5">
          <li>Make sure your NEXTAUTH_URL is set correctly</li>
          <li>Check secure cookie settings in auth.ts</li>
          <li>Clear browser cookies manually if needed</li>
          <li>Try using the Force Sign Out button to clear cookies programmatically</li>
        </ol>
      </div>
    </div>
  );
}