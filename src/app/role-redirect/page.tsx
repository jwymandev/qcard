'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthDebug from '@/components/AuthDebug';

export default function RoleRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Create a persistent ref to track if we've already redirected
  const redirected = useRef(false);
  
  // Enhanced check for token and session status
  useEffect(() => {
    let isMounted = true; // Prevent state updates after unmount
    
    async function checkAuthStatus() {
      try {
        console.log("Checking auth status...");
        const response = await fetch('/api/auth/auth-status');
        
        if (!response.ok) {
          if (isMounted) {
            setAuthError(`API error: ${response.status}`);
          }
          return;
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setDebugInfo(data);
        }
        
        console.log("Auth status check:", {
          session: data.session?.exists,
          token: data.token?.exists,
          cookies: data.cookies
        });
        
        // Token exists but no session - try force reloading the page once
        if (data.token?.exists && !session && status !== 'loading' && !redirected.current) {
          console.log("Token exists but session doesn't - force refreshing");
          // Force a full page reload to re-initialize the session
          window.location.href = '/role-redirect';
          return;
        }
        
        // Check for misconfiguration or missing cookies
        if (!data.token?.exists && !data.session?.exists && data.cookies?.hasSessionCookie) {
          console.error("Auth misconfiguration: Has session cookie but no token or session");
          if (isMounted) {
            setAuthError("Authentication misconfiguration detected");
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (isMounted) {
          setAuthError(error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }
    
    // Only run this if we're not already redirecting
    if (!redirected.current && status !== 'loading') {
      checkAuthStatus();
    }
    
    return () => {
      isMounted = false; // Cleanup to prevent state updates after unmount
    };
  }, [status, session]);
  
  // Enhanced redirect logic with better error handling
  useEffect(() => {
    // Avoid redirecting multiple times or while loading
    if (status === 'loading' || redirected.current) return;
    
    // Mark as redirected immediately to prevent loops
    redirected.current = true;
    
    console.log("Redirect triggered with status:", status);
    console.log("Session data:", session);
    
    // Add a timestamp to prevent redirect loops
    const now = Date.now();
    try {
      const lastRedirect = Number(localStorage.getItem('lastRedirect') || '0');
      const timeSinceLastRedirect = now - lastRedirect;
      
      // If we redirected very recently (within 2 seconds), don't redirect again
      if (timeSinceLastRedirect < 2000) {
        console.warn("Preventing redirect loop - redirected too recently");
        return;
      }
      
      localStorage.setItem('lastRedirect', now.toString());
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Handle unauthenticated state
    if (status === 'unauthenticated' || !session) {
      console.log("Not authenticated, redirecting to sign-in");
      
      // Force a full page reload to the sign-in page
      window.location.href = '/sign-in';
      return;
    }
    
    // Log session data for debugging
    console.log("Session user for redirect:", {
      id: session?.user?.id,
      role: session?.user?.role,
      tenantType: session?.user?.tenantType,
      isAdmin: session?.user?.isAdmin,
    });
    
    // Direct redirect based on user role/type - always use window.location for reliability
    if (session?.user?.isAdmin || session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.tenantType === 'ADMIN') {
      console.log("User is admin, redirecting to admin dashboard");
      window.location.href = '/admin/dashboard';
    } else if (session?.user?.tenantType === 'STUDIO') {
      console.log("User is studio, redirecting to studio dashboard");
      window.location.href = '/studio/dashboard';
    } else {
      console.log("User is talent, redirecting to talent dashboard");
      window.location.href = '/talent/dashboard';
    }
  }, [status, session, router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center max-w-lg px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
        
        {/* Show error message if any */}
        {authError && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            <p className="font-medium">Authentication Error:</p>
            <p>{authError}</p>
            <div className="mt-2">
              <button 
                onClick={() => window.location.href = '/sign-in'}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 mr-2"
              >
                Go to Sign In
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {/* Show debug information in development */}
        <div className="mt-8 text-left max-w-md mx-auto text-xs">
          <details>
            <summary className="cursor-pointer text-blue-500">Debug Information</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <div><strong>Session Status:</strong> {status}</div>
              <div><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</div>
              {session?.user && (
                <div>
                  <div><strong>User ID:</strong> {session.user.id}</div>
                  <div><strong>User Email:</strong> {session.user.email}</div>
                  <div><strong>User Role:</strong> {session.user.role}</div>
                  <div><strong>Is Admin:</strong> {session.user.isAdmin ? 'Yes' : 'No'}</div>
                  <div><strong>Tenant Type:</strong> {session.user.tenantType}</div>
                </div>
              )}
              {debugInfo && (
                <div className="mt-2">
                  <div><strong>API Status:</strong> {debugInfo.status}</div>
                  <div><strong>API Session:</strong> {debugInfo.session?.exists ? 'Yes' : 'No'}</div>
                  <div><strong>Has Token:</strong> {debugInfo.token?.exists ? 'Yes' : 'No'}</div>
                  <div><strong>Session Cookie:</strong> {debugInfo.cookies?.hasSessionCookie ? 'Present' : 'Missing'}</div>
                  <div><strong>Environment:</strong> {debugInfo.environment?.nodeEnv}</div>
                  <div><strong>Database Status:</strong> {debugInfo.database?.status}</div>
                  
                  {/* Manual redirect buttons */}
                  <div className="mt-3 border-t pt-3 border-gray-300">
                    <p className="font-bold mb-1">Manual Navigation:</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => window.location.href = '/talent/dashboard'}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                      >
                        Talent Dashboard
                      </button>
                      <button 
                        onClick={() => window.location.href = '/studio/dashboard'}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded"
                      >
                        Studio Dashboard
                      </button>
                      <button 
                        onClick={() => window.location.href = '/admin/dashboard'}
                        className="px-2 py-1 bg-purple-600 text-white text-xs rounded"
                      >
                        Admin Dashboard
                      </button>
                      <button 
                        onClick={() => window.location.href = '/auth-debug'}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded"
                      >
                        Auth Debug
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}