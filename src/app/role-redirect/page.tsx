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
        // Call debug endpoint to check the user's tenant type
        const response = await fetch('/api/debug-user');
        const userData = await response.json();
        
        console.log("Debug user data:", userData);
        
        if (userData.tenant?.type === 'STUDIO') {
          console.log("User is studio, redirecting to studio dashboard");
          router.push('/studio/dashboard');
        } else {
          console.log("User is talent, redirecting to talent dashboard");
          router.push('/talent/dashboard');
        }
        return;
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