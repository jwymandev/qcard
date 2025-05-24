'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [cookies, setCookies] = useState<string[]>([]);
  const [sessionJSON, setSessionJSON] = useState('');
  
  // Fetch database status on initial load
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        setDbLoading(true);
        setDbError(null);
        
        const res = await fetch('/api/auth/db-status');
        const data = await res.json();
        
        setDbStatus(data);
      } catch (error) {
        console.error("Error checking database:", error);
        setDbError(error instanceof Error ? error.message : String(error));
      } finally {
        setDbLoading(false);
      }
    };
    
    checkDatabase();
  }, []);
  
  // Get current cookies
  useEffect(() => {
    const cookieList = document.cookie.split(';').map(cookie => cookie.trim());
    setCookies(cookieList);
  }, []);
  
  // Format session data as JSON
  useEffect(() => {
    if (session) {
      setSessionJSON(JSON.stringify(session, null, 2));
    }
  }, [session]);
  
  // Format environment for display
  const formatEnvironment = () => {
    return {
      'NODE_ENV': process.env.NODE_ENV,
      'NEXT_PUBLIC_VERCEL_ENV': process.env.NEXT_PUBLIC_VERCEL_ENV,
      'NEXT_PUBLIC_VERCEL_URL': process.env.NEXT_PUBLIC_VERCEL_URL,
      'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL,
      'Build Time': typeof window !== 'undefined' ? 'No (Client)' : 'Yes (Server)',
      'Auth Provider': 'NextAuth.js with Credentials Provider',
      'Database': dbStatus?.databaseInfo?.database || 'Unknown',
      'Database Version': dbStatus?.databaseInfo?.version || 'Unknown'
    };
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          This page provides diagnostic information about your authentication status and environment.
          Use this to troubleshoot sign-in issues.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                status === 'authenticated' ? 'bg-green-100 text-green-800' :
                status === 'loading' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User:</span>
              <span>{session?.user?.email || 'Not signed in'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">User ID:</span>
              <span>{session?.user?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Role:</span>
              <span>{session?.user?.role || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tenant Type:</span>
              <span>{session?.user?.tenantType || 'N/A'}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Session Data:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
              {sessionJSON || 'No session data available'}
            </pre>
          </div>
        </div>
        
        {/* Environment */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Environment</h2>
          <div className="space-y-2">
            {Object.entries(formatEnvironment()).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span>{value?.toString() || 'Not set'}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Database Status */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Database Status</h2>
          
          {dbLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : dbError ? (
            <div className="bg-red-50 p-4 rounded">
              <p className="text-red-700">Error connecting to database:</p>
              <pre className="text-xs mt-2 bg-red-100 p-2 rounded overflow-auto">
                {dbError}
              </pre>
            </div>
          ) : dbStatus ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Connection:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  dbStatus.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {dbStatus.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Query Time:</span>
                <span>{dbStatus.queryTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">User Count:</span>
                <span>{dbStatus.userCount}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No database information available</p>
          )}
        </div>
        
        {/* Cookies */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Authentication Cookies</h2>
          
          {cookies.length > 0 ? (
            <div className="space-y-1">
              {cookies.map((cookie, index) => {
                // Only show auth-related cookies
                if (cookie.includes('next-auth') || cookie.includes('session') || cookie.includes('token')) {
                  const [name, value] = cookie.split('=');
                  return (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{name?.trim()}:</span> <span className="text-gray-600">{value || '[empty]'}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <p className="text-gray-500">No cookies found</p>
          )}
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => {
                document.cookie.split(';').forEach(c => {
                  const [name] = c.trim().split('=');
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                });
                setCookies([]);
                window.location.reload();
              }}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Clear All Cookies
            </button>
            <button
              onClick={() => {
                document.cookie.split(';').forEach(c => {
                  const [name] = c.trim().split('=');
                  if (name.includes('next-auth') || name.includes('session') || name.includes('token')) {
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                  }
                });
                setCookies(document.cookie.split(';').map(cookie => cookie.trim()));
                window.location.reload();
              }}
              className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
            >
              Clear Auth Cookies
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex space-x-4">
        <Link href="/sign-in" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go to Sign In
        </Link>
        <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Go to Homepage
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}