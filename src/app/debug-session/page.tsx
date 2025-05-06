'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DebugSessionPage() {
  const { data: session, status } = useSession();
  const [apiSession, setApiSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSessionData() {
      try {
        setIsLoading(true);
        
        // Get session from API
        const response = await fetch('/api/auth/debug-session');
        if (response.ok) {
          const data = await response.json();
          setApiSession(data);
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Only fetch if we're authenticated
    if (status === 'authenticated') {
      fetchSessionData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);
  
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
        <h1 className="text-2xl font-semibold text-red-600 mb-4">Not Authenticated</h1>
        <p className="mb-4">You need to be signed in to view session debug information.</p>
        <a href="/sign-in" className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Session Debug Information</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Client-Side Session</h2>
        <div className="bg-gray-100 p-4 rounded overflow-auto max-h-64">
          <pre className="text-sm">{JSON.stringify(session, null, 2)}</pre>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Server-Side Session</h2>
        <div className="bg-gray-100 p-4 rounded overflow-auto max-h-64">
          <pre className="text-sm">{JSON.stringify(apiSession, null, 2)}</pre>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-4 font-medium">Status</td>
              <td className="py-2 px-4">{status}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-4 font-medium">User ID</td>
              <td className="py-2 px-4">{session?.user?.id || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-4 font-medium">Email</td>
              <td className="py-2 px-4">{session?.user?.email || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-4 font-medium">Role</td>
              <td className="py-2 px-4">{session?.user?.role || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-4 font-medium">Tenant Type</td>
              <td className="py-2 px-4">{session?.user?.tenantType || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-4 font-medium">Is Admin</td>
              <td className="py-2 px-4">{session?.user?.isAdmin ? 'Yes' : 'No'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-center mt-6 space-x-4">
        <a 
          href="/sign-in" 
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
        >
          Sign In Again
        </a>
        <a 
          href="/role-redirect" 
          className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
        >
          Try Role Redirect
        </a>
        <a 
          href="/" 
          className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}