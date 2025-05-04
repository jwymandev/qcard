'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthDebug from '@/components/AuthDebug';

export default function RoleRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Create a persistent ref to track if we've already redirected
  const redirected = useRef(false);
  
  // Added fallback check just for role-redirect to check token explicitly
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const response = await fetch('/api/auth/auth-status');
        if (response.ok) {
          const data = await response.json();
          setDebugInfo(data);
          
          console.log("Auth status check:", {
            session: data.session.exists,
            token: data.token.exists,
            cookies: data.cookies
          });
          
          // If we have a token but not a session, attempt to force reload with redirect
          if (data.token.exists && !session && status !== 'loading' && !redirected.current) {
            console.log("Token exists but session doesn't - force refreshing");
            window.location.href = '/role-redirect';
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    }
    
    // Only run this if we're not already redirecting
    if (!redirected.current && status !== 'loading') {
      checkAuthStatus();
    }
  }, [status, session]);
  
  // Improved redirect based on session.user.tenantType with stronger loop prevention
  useEffect(() => {
    // Skip if loading or if we've already redirected
    if (status === 'loading' || redirected.current) return;
    
    // Mark as redirected immediately to prevent loops
    redirected.current = true;
    
    if (status === 'unauthenticated' || !session) {
      console.log("Not authenticated, redirecting to sign-in");
      router.push('/sign-in');
      return;
    }
    
    console.log("Session user:", session?.user);
    
    // Cache redirect decision to localStorage to help prevent loops
    try {
      localStorage.setItem('lastRedirect', Date.now().toString());
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Direct redirect based on session data
    if (session?.user?.tenantType === 'STUDIO') {
      console.log("User is studio, redirecting to studio dashboard");
      // Use replace instead of push to prevent browser history accumulation
      router.replace('/studio/dashboard');
    } else {
      console.log("User is talent, redirecting to talent dashboard");
      // Use replace instead of push to prevent browser history accumulation
      router.replace('/talent/dashboard');
    }
  }, [status, session, router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
        
        {/* Show debug information in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 text-left max-w-md mx-auto text-xs">
            <details>
              <summary className="cursor-pointer text-blue-500">Debug Information</summary>
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <div><strong>Session Status:</strong> {status}</div>
                <div><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</div>
                {session?.user && (
                  <div>
                    <div><strong>User ID:</strong> {session.user.id}</div>
                    <div><strong>Tenant Type:</strong> {session.user.tenantType}</div>
                  </div>
                )}
                {debugInfo && (
                  <div className="mt-2">
                    <div><strong>API Session:</strong> {debugInfo.session.exists ? 'Yes' : 'No'}</div>
                    <div><strong>Has Token:</strong> {debugInfo.token.exists ? 'Yes' : 'No'}</div>
                    <div><strong>Session Cookie:</strong> {debugInfo.cookies.hasSessionCookie ? 'Present' : 'Missing'}</div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>
      
      <AuthDebug />
    </div>
  );
}