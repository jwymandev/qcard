'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === 'loading') return;
    
    // If we have a session, redirect to the appropriate dashboard
    if (status === 'authenticated') {
      // Redirect to role redirect page to determine the appropriate dashboard
      router.push('/role-redirect');
    }
  }, [status, session, router]);
  
  // The ProtectedRoute component will handle authentication checks
  // and show loading/error states automatically
  return (
    <ProtectedRoute>
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}