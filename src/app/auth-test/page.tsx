'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AuthTest() {
  const { data: session, status } = useSession();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [accessTests, setAccessTests] = useState<{[key: string]: boolean | string}>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Test if we can access these protected routes
  const routesToTest = [
    '/dashboard',
    '/talent/dashboard',
    '/studio/dashboard',
    '/admin/dashboard',
    '/profile',
  ];
  
  useEffect(() => {
    async function fetchData() {
      try {
        // Check auth status
        const authStatusRes = await fetch('/api/auth/auth-status');
        const authStatusData = await authStatusRes.json();
        setAuthStatus(authStatusData);
        
        // Check session
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setSessionData(sessionData);
        
        // Check debug info
        const debugRes = await fetch('/api/auth/debug-session');
        const debugData = await debugRes.json();
        setDebugInfo(debugData);
        
        // Test protected routes
        const results: {[key: string]: boolean | string} = {};
        
        for (const route of routesToTest) {
          try {
            const start = Date.now();
            const res = await fetch(route, { redirect: 'manual' });
            const time = Date.now() - start;
            
            if (res.status === 200) {
              results[route] = `✅ (${time}ms)`;
            } else if (res.type === 'opaqueredirect') {
              results[route] = `🔄 Redirect (${time}ms)`;
            } else {
              results[route] = `❌ ${res.status} (${time}ms)`;
            }
          } catch (error) {
            results[route] = `⚠️ ${error instanceof Error ? error.message : 'Error'}`;
          }
        }
        
        setAccessTests(results);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching auth data:', error);
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      {isLoading ? (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Loading auth data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Quick Auth Status</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm font-medium">Session Status</div>
                <div className={`text-xl font-bold ${status === 'authenticated' ? 'text-green-600' : 'text-red-600'}`}>
                  {status === 'authenticated' ? '✅ Authenticated' : status === 'loading' ? '⏳ Loading' : '❌ Not Authenticated'}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm font-medium">Auth API Status</div>
                <div className={`text-xl font-bold ${authStatus?.status === 'authenticated' ? 'text-green-600' : 'text-red-600'}`}>
                  {authStatus?.status === 'authenticated' ? '✅ Authenticated' : '❌ Not Authenticated'}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm font-medium">User Role</div>
                <div className="text-xl font-bold">
                  {session?.user?.role || authStatus?.session?.user?.role || 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm font-medium">Tenant Type</div>
                <div className="text-xl font-bold">
                  {session?.user?.tenantType || authStatus?.session?.user?.tenantType || 'N/A'}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm font-medium">Auth Cookies</div>
                <div className={`text-xl font-bold ${authStatus?.cookies?.hasSessionCookie ? 'text-green-600' : 'text-red-600'}`}>
                  {authStatus?.cookies?.hasSessionCookie ? '✅ Present' : '❌ Missing'}
                </div>
              </div>
              
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm font-medium">JWT Token</div>
                <div className={`text-xl font-bold ${authStatus?.token?.exists ? 'text-green-600' : 'text-red-600'}`}>
                  {authStatus?.token?.exists ? '✅ Valid' : '❌ Invalid/Missing'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Protected Route Access Tests</h2>
            <ul className="space-y-2">
              {Object.entries(accessTests).map(([route, result]) => (
                <li key={route} className="flex items-center">
                  <span className="font-mono mr-2">{route}:</span>
                  <span className="flex-1">{result}</span>
                  <Link href={route} className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                    Visit
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Session Status from useSession</h2>
            <pre className="bg-gray-800 text-white p-2 rounded overflow-auto max-h-60 text-sm">
              {JSON.stringify({ status, user: session?.user }, null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Auth Status API</h2>
            <pre className="bg-gray-800 text-white p-2 rounded overflow-auto max-h-60 text-sm">
              {JSON.stringify(authStatus, null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Session API</h2>
            <pre className="bg-gray-800 text-white p-2 rounded overflow-auto max-h-60 text-sm">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Debug Session API</h2>
            <pre className="bg-gray-800 text-white p-2 rounded overflow-auto max-h-60 text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/sign-in" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Sign In
            </Link>
            <Link href="/role-redirect" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Role Redirect
            </Link>
            <Link href="/" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Home
            </Link>
            <Link href="/studio/dashboard" className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
              Studio Dashboard
            </Link>
            <Link href="/talent/dashboard" className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
              Talent Dashboard
            </Link>
            <Link href="/admin/dashboard" className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}