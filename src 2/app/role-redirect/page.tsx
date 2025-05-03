'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RoleRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function redirectToDashboard() {
      if (status === 'loading') return;
      
      console.log("Role redirect - session status:", status);
      console.log("Role redirect - session data:", session);
      
      if (status === 'unauthenticated' || !session) {
        console.log("Not authenticated, redirecting to sign-in");
        router.push('/sign-in');
        return;
      }
      
      try {
        // Check if we already have tenant type in the session
        if (session.user?.tenantType) {
          if (session.user.tenantType === 'STUDIO') {
            console.log("User is studio, redirecting to studio dashboard");
            router.push('/studio/dashboard');
          } else {
            console.log("User is talent, redirecting to talent dashboard");
            router.push('/talent/dashboard');
          }
          return;
        }
        
        // Fallback: Try to get tenant info from API
        console.log("No tenant type in session, trying API");
        try {
          // Simplified API call - avoid direct DB access in components
          const response = await fetch('/api/auth/session');
          const freshSession = await response.json();
          
          if (freshSession?.user?.tenantType === 'STUDIO') {
            router.push('/studio/dashboard');
          } else {
            // Default to talent if we can't determine
            router.push('/talent/dashboard');
          }
        } catch (apiError) {
          console.error("API error:", apiError);
          // Default to talent dashboard if API fails
          router.push('/talent/dashboard');
        }
      } catch (error) {
        console.error("Redirect error:", error);
        setError("An error occurred during redirection. Please try signing in again.");
      }
    }
    
    redirectToDashboard();
  }, [status, session, router]);
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-50 p-4 rounded-md text-red-700 max-w-md">
          <p className="font-bold mb-2">Error</p>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/sign-in')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}