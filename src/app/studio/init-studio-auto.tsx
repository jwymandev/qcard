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
  const [isInitializing, setIsInitializing] = useState(false);

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
      if (status !== 'authenticated' || !session?.user?.id || initAttempted || isInitializing) return;

      // Check if we recently initialized to prevent loops
      const recentInit = sessionStorage.getItem('studioInitRecent');
      if (recentInit) {
        const initTime = parseInt(recentInit);
        const now = Date.now();
        // Prevent re-init for 30 seconds
        if (now - initTime < 30000) {
          console.log("Recent initialization detected, skipping...");
          router.replace('/studio/dashboard');
          return;
        }
      }

      try {
        console.log("Auto-initializing studio account...");
        setInitAttempted(true);
        setIsInitializing(true);
        
        // Mark initialization as recent
        sessionStorage.setItem('studioInitRecent', Date.now().toString());

        // Try the auto-init endpoint first as it's more robust
        const response = await fetch('/api/studio/auto-init', {
          method: 'POST',
          credentials: 'include', // Ensure cookies are sent
          headers: {
            'Cache-Control': 'no-cache', // Prevent caching issues
          },
        });
        
        if (!response.ok) {
          const data = await response.json();
          
          // Check if this is a stale session issue (user not found)
          if (response.status === 404 && data.error?.includes('User not found')) {
            console.error('Stale session detected - user ID in session does not exist in database');
            // Force sign out to clear stale session
            window.location.href = '/api/auth/signout?callbackUrl=/sign-in';
            return;
          }
          
          // Check if user has no tenant (corrupted session)
          if (response.status === 400 && data.error?.includes('no tenant')) {
            console.error('Corrupted session detected - user has no tenant');
            // Force sign out to clear corrupted session
            window.location.href = '/api/auth/signout?callbackUrl=/sign-in';
            return;
          }
          
          throw new Error(data.error || 'Failed to initialize studio account');
        }
        
        console.log("Studio account initialized successfully");
        
        // Redirect back to the page they were trying to access, or dashboard if none
        const redirectUrl = returnUrl || '/studio/dashboard';
        
        // Clear stored URLs and recent init flag
        localStorage.removeItem('studioInitReturnUrl');
        sessionStorage.removeItem('studioInitRecent');
        
        // Use Next.js router for client-side navigation instead of full page reload
        router.replace(redirectUrl);
      } catch (error) {
        console.error('Error auto-initializing studio:', error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred initializing studio';
        setError(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    }

    // Run auto-initialization
    autoInitialize();
  }, [session?.user?.id, status, initAttempted]); // Only depend on specific session values, not entire object

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