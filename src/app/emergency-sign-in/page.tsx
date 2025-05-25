'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Emergency sign-in page that immediately redirects to the sign-in page with emergency mode enabled
 * This page can be accessed directly at /emergency-sign-in and will always redirect to the simplified sign-in
 */
export default function EmergencySignInRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the sign-in page with emergency mode enabled
    router.push('/sign-in?emergency=true');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Emergency Sign-in</h1>
        <p className="text-gray-600 mb-4">Redirecting to simplified sign-in page...</p>
      </div>
    </div>
  );
}