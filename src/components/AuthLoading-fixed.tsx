'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Fixed version of AuthLoading component that avoids hook-related errors
 */
export default function AuthLoading({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const router = useRouter();

  // Initialize debug panel
  useEffect(() => {
    // Check if debug mode should be enabled
    const debugParam = new URLSearchParams(window.location.search).get('debug');
    setIsDebugEnabled(debugParam === 'true' || localStorage.getItem('qcard_debug') === 'true');
    
    // Create debug helper functions
    window.enableQCardDebug = () => {
      localStorage.setItem('qcard_debug', 'true');
      setIsDebugEnabled(true);
      console.log('QCard debug mode enabled');
    };
    
    window.disableQCardDebug = () => {
      localStorage.removeItem('qcard_debug');
      setIsDebugEnabled(false);
      console.log('QCard debug mode disabled');
    };
    
    // Log authentication state for debugging
    console.log(`Auth status: ${status}`);
    console.log(`Session exists: ${!!session}`);
    if (session) {
      console.log('Session details:', {
        user: session.user?.name,
        email: session.user?.email,
        expires: session.expires,
      });
    }
  }, [status, session]);

  // Handle session hydration timing
  useEffect(() => {
    console.log(`Initial loading state. Status: ${status}`);
    
    // Use a longer timeout to ensure session is properly hydrated
    const timer = setTimeout(() => {
      console.log(`Setting loading to false. Current auth status: ${status}`);
      setIsLoading(false);
    }, 1000); // Increased from 500ms to 1000ms

    return () => clearTimeout(timer);
  }, [status]);

  // Track loading time
  useEffect(() => {
    // Only start the timer if we're loading
    if (isLoading || status === 'loading') {
      const timer = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLoading, status]);

  // Debug panel component for easy debugging
  const DebugPanel = () => {
    if (!isDebugEnabled) return null;
    
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 9999,
        maxWidth: '400px',
        overflow: 'auto',
        maxHeight: '50vh',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <div><strong>QCard Debug</strong></div>
        <div><strong>Auth Status:</strong> {status}</div>
        <div><strong>Path:</strong> {window.location.pathname}</div>
        <div><strong>isLoading:</strong> {isLoading ? 'true' : 'false'}</div>
        <div><strong>Session:</strong> {session ? 'exists' : 'none'}</div>
        {session && (
          <div>
            <div><strong>User:</strong> {session.user?.name}</div>
            <div><strong>Email:</strong> {session.user?.email}</div>
            <div><strong>Expires:</strong> {session.expires}</div>
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => window.disableQCardDebug()} style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}>Hide Debug</button>
        </div>
      </div>
    );
  };

  // If we're still loading the session, show a loading indicator with emergency bypass
  if (isLoading || status === 'loading') {
    // If loading for more than 8 seconds, show emergency bypass option
    const showEmergencyBypass = loadingTime > 8;

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700">Loading authentication... ({loadingTime}s)</p>
          <p className="text-sm text-gray-500">Status: {status}</p>
          
          {showEmergencyBypass && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-700">Authentication is taking longer than expected</p>
              <p className="text-xs text-red-600 mb-3">This may be due to database schema mismatch</p>
              <button 
                onClick={() => {
                  // Add bypass parameter to URL
                  const url = new URL(window.location.href);
                  url.searchParams.set('emergency_bypass', 'true');
                  window.location.href = url.toString();
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 mr-2"
              >
                Emergency Bypass
              </button>
              <button 
                onClick={() => setIsLoading(false)}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Force Continue
              </button>
            </div>
          )}
          
          {isDebugEnabled && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <p className="text-xs font-mono">Debug: Loading auth, status={status}</p>
              <p className="text-xs font-mono">Session: {session ? 'exists' : 'null'}</p>
              <p className="text-xs font-mono">Path: {window.location.pathname}</p>
            </div>
          )}
        </div>
        <DebugPanel />
      </div>
    );
  }

  // If there was a session error, try to recover by redirecting to sign in
  // But only for protected paths
  if (status === 'unauthenticated') {
    const currentPath = window.location.pathname;
    const isPublicPath = currentPath === '/sign-in' || 
                          currentPath === '/sign-up' || 
                          currentPath === '/' ||
                          currentPath === '/subscription' ||
                          currentPath === '/emergency-logout';
    
    if (!isPublicPath) {
      console.log(`Unauthenticated on protected path: ${currentPath}, redirecting to sign-in`);
      // Use replace instead of push to avoid redirect loops
      router.replace('/sign-in');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-gray-700">Redirecting to sign in...</p>
            <p className="text-sm text-gray-500">No active session found</p>
            {isDebugEnabled && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <p className="text-xs font-mono">Debug: Unauthenticated redirect</p>
                <p className="text-xs font-mono">From: {currentPath}</p>
                <button onClick={() => router.back()} className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                  Go Back
                </button>
              </div>
            )}
          </div>
          <DebugPanel />
        </div>
      );
    }
  }

  // Otherwise, render the children with debug panel if enabled
  return (
    <>
      {children}
      <DebugPanel />
    </>
  );
}