'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cookies, setCookies] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('Not tested');

  // Extract error from URL if present
  const errorMessage = searchParams.get('error') || 'No error specified';
  const originalPath = searchParams.get('path') || '/';

  // Get cookies on client side
  useEffect(() => {
    setCookies(document.cookie || 'No cookies found');
  }, []);

  // Test auth API endpoint
  const testAuthEndpoint = async () => {
    try {
      setTestResult('Testing...');
      const response = await fetch('/api/auth/auth-status');
      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setTestResult(`Error testing auth: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Authentication Debug Page</h1>
        
        <div className="p-4 mb-6 bg-yellow-50 border border-yellow-200 rounded-md">
          <h2 className="font-semibold text-yellow-800 mb-2">⚠️ Authentication Error</h2>
          <p className="text-yellow-700">
            You were redirected here because the authentication system encountered an error.
          </p>
          <p className="mt-1 font-medium">Error: {errorMessage}</p>
          <p className="mt-1">Original path: {originalPath}</p>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3">Session Status</h2>
          <div className="p-2 bg-white rounded border border-gray-200">
            <p><strong>Status:</strong> {status}</p>
            
            {status === 'authenticated' && session && (
              <div className="mt-2">
                <p><strong>User:</strong> {session.user?.name || 'Not provided'}</p>
                <p><strong>Email:</strong> {session.user?.email || 'Not provided'}</p>
                <p><strong>Expires:</strong> {session.expires || 'Not provided'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-lg mb-3">Browser Cookies</h2>
          <div className="overflow-auto max-h-40 p-2 bg-white rounded border border-gray-200 text-sm font-mono whitespace-pre-wrap">
            {cookies || 'No cookies found'}
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Home
          </button>
          
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Go Back
          </button>
          
          <button
            onClick={() => {
              document.cookie = 'next-auth.session-token=; Max-Age=0; path=/;';
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Clear Cookies
          </button>
        </div>
      </div>
    </div>
  );
}