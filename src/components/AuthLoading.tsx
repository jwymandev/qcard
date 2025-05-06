'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * AuthLoading component that ensures we properly handle authentication state
 * and prevent raw JSON responses during auth operations
 */
export default function AuthLoading({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // On initial load, briefly wait to ensure session is properly hydrated
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // If we're still loading the session, show a loading indicator
  if (isLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // If there was a session error, try to recover by redirecting to sign in
  if (status === 'unauthenticated' && window.location.pathname !== '/sign-in' && 
      window.location.pathname !== '/sign-up' && window.location.pathname !== '/') {
    router.push('/sign-in');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-gray-700">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Otherwise, render the children
  return <>{children}</>;
}