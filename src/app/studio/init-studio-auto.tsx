'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
/**
 * Automatically initializes a studio profile without requiring user interaction
 * Shows a loading screen while initializing
 */
export default function AutoInitStudio() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [initAttempted, setInitAttempted] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  // Get return URL from query parameters or storage
  useEffect(() => {
    // Check for return_to in query params first
    const returnToParam = searchParams.get('return_to');
    if (returnToParam) {
      setReturnUrl(decodeURIComponent(returnToParam));
    } else {
      // Check localStorage as fallback
      const storedUrl = localStorage.getItem('studioInitReturnUrl');
      if (storedUrl) {
        setReturnUrl(storedUrl);
      }
    }
  }, [searchParams]);

  // Automatically initialize studio when component loads
  useEffect(() => {
    async function autoInitialize() {
      if (status !== 'authenticated' || !session?.user?.id || initAttempted) return;

      try {
        console.log("Auto-initializing studio account...");
        setInitAttempted(true);

        // Try the auto-init endpoint first as it's more robust
        const response = await fetch('/api/studio/auto-init', {
          method: 'POST',
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to initialize studio account');
        }
        
        console.log("Studio account initialized successfully");
        
        // Redirect back to the page they were trying to access, or dashboard if none
        const redirectUrl = returnUrl || '/studio/dashboard';
        
        // Clear stored URLs
        localStorage.removeItem('studioInitReturnUrl');
        
        // Redirect and reload to refresh session data
        window.location.href = redirectUrl;
      } catch (error) {
        console.error('Error auto-initializing studio:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred initializing studio';
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
        <h2 className="text-xl font-semibold mb-2">Setting Up Your Studio</h2>
        <p className="text-gray-600 text-center max-w-sm">
          We&apos;re getting everything ready for you. This will only take a moment.
        </p>
      </div>
    </div>
  );
}