'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { signIn } from '@/lib/client-auth';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDebugMode = searchParams?.get('debug') === 'true';
  const hasAuthTimeout = searchParams?.get('auth_timeout') === 'true';
  const isNewlyRegistered = searchParams?.get('registered') === 'true';
  const callbackUrl = searchParams?.get('callbackUrl') || '/role-redirect';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Simplified approach: just use NextAuth directly
      console.log("Attempting sign-in with next-auth...");
      
      // Simplest possible approach - direct signin with redirect
      try {
        console.log(`Signing in user: ${email}`);
        
        // Use client-auth signIn helper which wraps NextAuth signIn
        const result = await signIn({
          email,
          password,
          redirect: false,
          callbackUrl
        });
        
        console.log("Sign-in result:", result);
        
        if (result?.error) {
          // Handle specific errors with more user-friendly messages
          if (result.error === 'CredentialsSignin') {
            // Check if the email exists first to provide a more specific error
            try {
              const checkEmail = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
              const emailData = await checkEmail.json();
              
              if (emailData.exists) {
                setError('Incorrect password. Please try again.');
              } else {
                setError('User not found. Please check your email or create an account.');
              }
            } catch (e) {
              // Fallback to generic message if email check fails
              setError('Invalid email or password. Please try again.');
            }
          } else {
            // For other errors, show a friendly message
            setError(result.error);
          }
          setIsLoading(false);
        } else if (result?.ok) {
          // Success! Now redirect
          console.log("Sign-in successful, redirecting...");
          window.location.href = callbackUrl;
        } else {
          // Unexpected result
          setError('An unexpected error occurred. Please try again.');
          setIsLoading(false);
        }
      } catch (signInError) {
        console.error("Sign-in process error:", signInError);
        setError('An error occurred during sign-in. Please try again.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setError('An error occurred during sign in. Please try again.');
      setIsLoading(false);
    }
  };

  // Enhanced debug section for troubleshooting
  const DebugSection = () => {
    if (!showDebugMode) return null;
    
    const [dbStatus, setDbStatus] = useState<any>(null);
    const [isCheckingDb, setIsCheckingDb] = useState(false);
    
    // Function to check database status
    const checkDbStatus = async () => {
      setIsCheckingDb(true);
      try {
        const response = await fetch('/api/auth/db-status');
        if (response.ok) {
          const data = await response.json();
          setDbStatus(data);
        } else {
          setDbStatus({ error: `API error: ${response.status}` });
        }
      } catch (error) {
        setDbStatus({ error: String(error) });
      } finally {
        setIsCheckingDb(false);
      }
    };
    
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded-md text-xs font-mono">
        <h3 className="font-bold mb-2">Auth Debug Info</h3>
        <p>URL: {window.location.href}</p>
        <p>Search params: {searchParams?.toString()}</p>
        <p>Callback URL: {callbackUrl}</p>
        <div className="mt-2">
          <button 
            className="bg-gray-200 px-2 py-1 rounded"
            onClick={() => localStorage.clear()}
          >
            Clear LocalStorage
          </button>
          <Link 
            href="/auth-debug"
            className="ml-2 bg-blue-500 text-white px-2 py-1 rounded inline-block"
          >
            Auth Debug Page
          </Link>
        </div>
        
        {/* Database status check */}
        <div className="mt-3 pt-2 border-t border-gray-300">
          <button 
            onClick={checkDbStatus}
            disabled={isCheckingDb}
            className="bg-green-500 text-white px-2 py-1 rounded text-xs"
          >
            {isCheckingDb ? 'Checking...' : 'Check Database'}
          </button>
          
          {dbStatus && (
            <div className="mt-2 p-2 bg-gray-200 rounded text-xs">
              {dbStatus.error ? (
                <p className="text-red-600">Error: {dbStatus.error}</p>
              ) : (
                <>
                  <p>Status: <span className={dbStatus.status === 'connected' ? 'text-green-600' : 'text-red-600'}>
                    {dbStatus.status}
                  </span></p>
                  <p>Users: {dbStatus.userCount || 0}</p>
                  {dbStatus.database?.status && <p>DB: {dbStatus.database.status}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
      
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/sign-up"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        {isNewlyRegistered && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Account created successfully!</p>
              <p className="mt-1 text-xs">
                Please sign in with your new credentials to continue.
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
              {error.includes('User not found') && (
                <p className="mt-1 text-xs">
                  Don't have an account?{' '}
                  <Link href="/sign-up" className="font-medium text-red-700 hover:text-red-600">
                    Sign up now
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Auth timeout notification */}
        {hasAuthTimeout && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  <strong>Database connection issue detected.</strong> You've been redirected to the sign-in page due to database connectivity issues. You can:
                </p>
                <ul className="list-disc ml-5 mt-1 text-xs">
                  <li>Try signing in (the database may be available now)</li>
                  <li>Try again later if the issue persists</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Additional info about database connectivity */}
        {hasAuthTimeout && !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded flex items-start">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                <span className="font-medium">Database Status Check:</span> Our system detected a recent database issue that has been resolved. If you encounter any sign-in problems, please try again or contact support.
              </p>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        {/* Debug section for troubleshooting */}
        <DebugSection />
        
      </div>
    </div>
  );
}