'use client';

import React from 'react';

/**
 * Global error component that provides detailed error information
 * and recovery options for debugging white screen issues
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Track if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Error handling function
  const handleReport = () => {
    console.error('Reported error:', error);
    // In a real app, you'd send this to your error tracking service
  };

  // Handle navigation back
  const handleBack = () => {
    window.history.back();
  };

  // Extract useful error properties
  const errorDetails = {
    message: error.message || 'Unknown error',
    stack: error.stack || 'No stack trace available',
    name: error.name || 'Error',
    digest: error.digest || 'No digest available',
  };

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 className="mb-4 text-2xl font-bold text-center text-gray-800">
              Something went wrong!
            </h1>
            
            <div className="mb-6 text-center text-gray-600">
              <p>The application encountered an unexpected error.</p>
              <p className="mt-2 font-medium text-red-600">{errorDetails.message}</p>
            </div>
            
            {/* Error details - only in dev mode or when debug=true */}
            {(isDev || new URLSearchParams(window.location.search).get('debug') === 'true') && (
              <div className="p-4 mb-6 overflow-auto text-sm bg-gray-100 rounded-md max-h-48">
                <p className="font-bold">Error Name: {errorDetails.name}</p>
                {errorDetails.digest && <p className="font-mono">Digest: {errorDetails.digest}</p>}
                <p className="mt-2 font-bold">Stack Trace:</p>
                <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                  {errorDetails.stack}
                </pre>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={reset}
                className="px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Try Again
              </button>
              
              <button
                onClick={handleBack}
                className="px-4 py-2 font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Go Back
              </button>
              
              <button
                onClick={handleReport}
                className="px-4 py-2 font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Report Issue
              </button>
            </div>
            
            {/* Debug button to toggle error details */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  const url = new URL(window.location.href);
                  if (url.searchParams.has('debug')) {
                    url.searchParams.delete('debug');
                  } else {
                    url.searchParams.set('debug', 'true');
                  }
                  window.location.href = url.toString();
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {new URLSearchParams(window.location.search).has('debug')
                  ? 'Hide Debug Info'
                  : 'Show Debug Info'}
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}