'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InitProfile({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initializeProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Skip debug calls in production/deployment environments
      if (process.env.NODE_ENV === 'development') {
        console.log("Development environment - skipping debug API calls");
      }
      
      // Now attempt to initialize the profile
      console.log("Attempting to initialize profile...");
      const response = await fetch('/api/talent-init', {
        method: 'POST',
      });
      
      // Log detailed response information regardless of success/failure
      console.log("Profile initialization response status:", response.status);
      
      // Log headers in a way that's compatible with the tsconfig target
      const headerObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      console.log("Profile initialization response headers:", headerObj);
      
      const responseText = await response.text();
      console.log("Raw response text:", responseText);
      
      let responseData;
      try {
        // Try to parse as JSON, but don't fail if it's not valid JSON
        responseData = JSON.parse(responseText);
        console.log("Parsed response data:", responseData);
      } catch (parseError) {
        console.error("Could not parse response as JSON:", parseError);
      }
      
      if (!response.ok) {
        throw new Error(responseData?.error || `Failed to initialize profile: ${response.status} ${response.statusText}`);
      }
      
      console.log("Profile initialization successful");
      setSuccess(true);
      
      // If onSuccess is provided, call it instead of navigating
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        // Otherwise, use router to navigate back to profile page after 2 seconds
        setTimeout(() => {
          // Avoid router.refresh() which can cause unnecessary reloads
          router.push('/talent/profile'); // Navigate properly
        }, 2000);
      }
    } catch (error) {
      console.error('Error initializing profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while initializing profile';
      setError(errorMessage);
      
      // Additional diagnostic information in the console
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <div className="text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <h2 className="text-2xl font-bold mt-4 mb-2">Profile Initialized!</h2>
            <p className="text-gray-600 mb-4">Your profile has been set up successfully.</p>
            <p className="text-sm text-gray-500">Reloading page...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h2 className="text-2xl font-bold mb-4">Profile Setup</h2>
        <p className="text-gray-600 mb-6">
          It looks like your talent profile needs to be initialized. This is a one-time setup that will allow you to create your casting profile.
        </p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            onClick={initializeProfile}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Initializing...
              </>
            ) : 'Initialize Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}