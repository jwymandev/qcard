'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Automatically initializes a talent profile without requiring user interaction
 * Shows a loading screen while initializing
 */
export default function AutoInitProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [initAttempted, setInitAttempted] = useState(false);
  
  // Automatically initialize talent profile when component loads
  useEffect(() => {
    async function autoInitialize() {
      if (status !== 'authenticated' || !session?.user?.id || initAttempted) return;

      try {
        console.log("Auto-initializing talent profile...");
        setInitAttempted(true);
        
        const response = await fetch('/api/talent-init', {
          method: 'POST',
        });
        
        if (!response.ok) {
          let errorMessage = 'Failed to initialize profile';
          try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
          } catch {
            // If response isn't JSON, use status text
            errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        console.log("Talent profile initialized successfully");
        
        // Redirect to profile page after initialization
        router.push('/talent/profile');
        // Also trigger a reload to refresh session data
        window.location.reload();
      } catch (error) {
        console.error('Error auto-initializing profile:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred initializing profile';
        setError(errorMessage);
      }
    }

    // Run auto-initialization
    autoInitialize();
  }, [session, status, router, initAttempted]);

  // If there's an error, show error screen
  if (error) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="text-center p-6 max-w-md">
          <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-2xl font-bold mt-4 mb-2">Setup Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setInitAttempted(false);
              setError(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen while initializing
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h2 className="text-xl font-semibold mb-2">Setting Up Your Talent Profile</h2>
        <p className="text-gray-600 text-center max-w-sm">
          We&apos;re getting everything ready for you. This will only take a moment.
        </p>
      </div>
    </div>
  );
}