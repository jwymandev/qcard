'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthLoadingWithFallback({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);
  const [showError, setShowError] = useState(false);
  const router = useRouter();

  // Handle session hydration timing
  useEffect(() => {
    console.log(`Initial loading state. Status: ${status}`);
    
    // Use a longer timeout to ensure session is properly hydrated
    const timer = setTimeout(() => {
      console.log(`Setting loading to false. Current auth status: ${status}`);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [status]);

  // Track loading time and show error after timeout
  useEffect(() => {
    if (isLoading || status === 'loading') {
      const timer = setInterval(() => {
        setLoadingTime(prev => {
          const newTime = prev + 1;
          // Show error after 3 seconds of loading (matching middleware timeout)
          if (newTime === 3) {
            setShowError(true);
            // Redirect to sign-in for unauthenticated users after timeout
            if (status === 'unauthenticated' || status === 'loading') {
              window.location.href = '/sign-in?auth_timeout=true';
            }
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLoading, status, router]);

  // If still loading but we've reached the timeout, show a helpful error screen
  if ((isLoading || status === 'loading') && showError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Connection Issue</h2>
            <div className="mt-2 text-sm text-gray-500">
              We're having trouble connecting to our services
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Database connection error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>We're having trouble connecting to our database. This could be due to:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Temporary service disruption</li>
                    <li>Database maintenance</li>
                    <li>Network connectivity issues</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">Try these options:</p>
              <div className="pt-2 flex flex-col space-y-2">
                <Link 
                  href="/?bypass_auth=true"
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Access Home Page
                </Link>
                <Link 
                  href="/sign-in?bypass_auth=true"
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Go to Sign In
                </Link>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-8 text-center">
            <p>If the problem persists, please contact support.</p>
            <p className="mt-1">Error occurred after {loadingTime} seconds of loading</p>
          </div>
        </div>
      </div>
    );
  }

  // Regular loading screen, will show for up to 10 seconds before the error appears
  if (isLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700">Loading authentication... ({loadingTime}s)</p>
          <p className="text-sm text-gray-500">Status: {status}</p>
          
          {loadingTime > 5 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-700">Loading is taking longer than expected</p>
              <p className="text-xs text-red-600 mb-3">This may be due to database connection issues</p>
              <Link 
                href="/?bypass_auth=true"
                className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 mr-2 inline-block"
                style={{ textDecoration: 'none' }}
              >
                Emergency Bypass
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle unauthenticated states for protected routes
  if (status === 'unauthenticated') {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPublicPath = currentPath === '/sign-in' || 
                          currentPath === '/sign-up' || 
                          currentPath === '/' ||
                          currentPath === '/subscription' ||
                          currentPath === '/emergency';
    
    if (!isPublicPath) {
      console.log(`Unauthenticated on protected path: ${currentPath}, redirecting to sign-in`);
      router.replace('/sign-in');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-gray-700">Redirecting to sign in...</p>
            <p className="text-sm text-gray-500">No active session found</p>
          </div>
        </div>
      );
    }
  }

  // If authenticated or on a public page, render the children
  return <>{children}</>;
}