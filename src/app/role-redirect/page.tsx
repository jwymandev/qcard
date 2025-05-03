'use client';

import React, { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function RoleRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Create a persistent ref to track if we've already redirected
  const redirected = useRef(false);
  
  // Simple redirect based on session.user.tenantType
  useEffect(() => {
    // Skip if loading or if we've already redirected
    if (status === 'loading' || redirected.current) return;
    
    if (status === 'unauthenticated' || !session) {
      console.log("Not authenticated, redirecting to sign-in");
      redirected.current = true;
      router.push('/sign-in');
      return;
    }
    
    console.log("Session user:", session?.user);
    
    // Mark as redirected to prevent additional redirects
    redirected.current = true;
    
    // Direct redirect based on session data
    if (session?.user?.tenantType === 'STUDIO') {
      console.log("User is studio, redirecting to studio dashboard");
      router.push('/studio/dashboard');
    } else {
      console.log("User is talent, redirecting to talent dashboard");
      router.push('/talent/dashboard');
    }
  }, [status, session, router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}