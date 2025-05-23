'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * User-friendly error messages for authentication errors
 */
const errorMessages: Record<string, string> = {
  'CredentialsSignin': 'Invalid email or password. Please try again.',
  'SessionRequired': 'You need to be signed in to access this page.',
  'AccessDenied': 'You do not have permission to access this resource.',
  'CallbackError': 'There was a problem with the authentication callback.',
  'OAuthSignin': 'There was a problem starting the OAuth sign-in process.',
  'OAuthCallback': 'There was a problem with the OAuth callback.',
  'EmailSignin': 'There was a problem sending the email for sign-in.',
  'EmailVerify': 'The email verification link expired or was already used.',
  'Configuration': 'There is a problem with the authentication configuration.',
  'Default': 'An unexpected authentication error occurred. Please try again.'
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState('');
  
  useEffect(() => {
    // Get error type from URL
    const error = searchParams?.get('error') || 'Default';
    setErrorType(error);
    
    // Get the corresponding message
    setErrorMessage(errorMessages[error] || errorMessages.Default);
  }, [searchParams]);
  
  return (
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Authentication Error
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {errorMessage}
        </p>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded">
        <p className="text-sm">
          Error type: {errorType}
        </p>
        {errorType === 'CredentialsSignin' && (
          <p className="text-sm mt-2">
            This error typically means the credentials you provided were incorrect or the account does not exist.
          </p>
        )}
        {errorType === 'Configuration' && (
          <p className="text-sm mt-2">
            This is a system configuration error. Please contact support.
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-center space-x-4">
        <Link 
          href="/sign-in" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Sign In
        </Link>
        
        <Link 
          href="/" 
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<LoadingFallback />}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}