'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/lib/client-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import BypassSignIn from './bypass-signin';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBypass = searchParams?.get('emergency_bypass') === 'true' || 
                  searchParams?.get('bypass_auth') === 'true';
  const showDebugMode = searchParams?.get('debug') === 'true';
  const hasAuthTimeout = searchParams?.get('auth_timeout') === 'true';

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
          callbackUrl: '/role-redirect'
        });
        
        console.log("Sign-in result:", result);
        
        if (result?.error) {
          // Handle specific errors
          setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error);
          setIsLoading(false);
        } else if (result?.ok) {
          // Success! Now redirect
          console.log("Sign-in successful, redirecting...");
          window.location.href = '/role-redirect';
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

  // Debug info section for troubleshooting
  const DebugSection = () => {
    if (!showDebugMode) return null;
    
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded-md text-xs font-mono">
        <h3 className="font-bold mb-2">Auth Debug Info</h3>
        <p>URL: {window.location.href}</p>
        <p>Search params: {searchParams?.toString()}</p>
        <p>Bypass mode: {isBypass ? 'Enabled' : 'Disabled'}</p>
        <div className="mt-2">
          <button 
            className="bg-gray-200 px-2 py-1 rounded"
            onClick={() => localStorage.clear()}
          >
            Clear LocalStorage
          </button>
          <Link 
            href="/emergency-logout"
            className="ml-2 bg-gray-200 px-2 py-1 rounded inline-block"
          >
            Clear All Cookies
          </Link>
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
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
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
        
        {/* Display emergency bypass component if in emergency mode */}
        <BypassSignIn />
        
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