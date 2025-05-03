'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [devMessage, setDevMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // First try our debugging endpoint to see if we can diagnose the issue
      console.log("Checking auth debug...");
      const debugResponse = await fetch('/api/auth-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const debugData = await debugResponse.json();
      console.log("Auth debug response:", debugData);
      
      // Now try to sign in with next-auth
      console.log("Attempting sign-in with next-auth...");
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      console.log("Sign-in result:", result);
      
      if (result?.error) {
        console.error("Authentication error:", result.error);
        
        // Try to provide a more specific error message
        if (result.error.includes("tenant") || result.error.includes("schema")) {
          // Database schema issue - help the user
          setError('Authentication server error. Please try refreshing the page or use the development tools to reset your password.');
        } else if (debugData.emailExists === false) {
          setError('Email not found. Please check your email or sign up for an account.');
        } else if (debugData.userHasPassword === false) {
          setError('This account does not have a password set. Try another sign-in method.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
        setIsLoading(false);
        return;
      }
      
      // After successful login, check session to determine redirect
      console.log("Sign-in successful, checking session...");
      const session = await fetch('/api/auth/session');
      const sessionData = await session.json();
      console.log("Session data:", sessionData);
      
      if (sessionData && sessionData.user) {
        // Redirect to role-redirect page to determine the correct dashboard
        console.log("Redirecting to role redirect...");
        router.push('/role-redirect');
        router.refresh();
      } else {
        // Fallback to role-redirect if session data is unavailable
        console.log("Session data incomplete, using fallback redirect...");
        router.push('/role-redirect');
        router.refresh();
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setError('An error occurred during sign in. Please try again.');
      setIsLoading(false);
    }
  };

  // Development helper functions
  const resetPassword = async () => {
    if (!email || !newPassword) {
      setDevMessage("Email and new password are required");
      return;
    }
    
    try {
      const response = await fetch('/api/dev-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword }),
      });
      
      const data = await response.json();
      setDevMessage(data.message || data.error || "Password reset completed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDevMessage("Error: " + errorMessage);
    }
  };
  
  const createTestUser = async () => {
    if (!email || !password) {
      setDevMessage("Email and password are required");
      return;
    }
    
    try {
      const response = await fetch('/api/dev-create-test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          firstName: "Test",
          lastName: "User",
          tenantType: "TALENT"
        }),
      });
      
      const data = await response.json();
      setDevMessage(data.message || data.error || "User creation completed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDevMessage("Error: " + errorMessage);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Development mode tools */}
        <div className="text-center">
          <button 
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() => setShowDevTools(!showDevTools)}
          >
            {showDevTools ? 'Hide Development Tools' : 'Show Development Tools'}
          </button>
          
          {showDevTools && (
            <div className="mt-4 p-4 border border-yellow-300 bg-yellow-50 rounded">
              <h3 className="font-bold text-yellow-700">Development Tools</h3>
              <p className="text-xs text-yellow-600 mb-2">These tools are for development only</p>
              
              <div className="space-y-2">
                <div>
                  <label className="block text-xs">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={resetPassword}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={createTestUser}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Create Test User
                  </button>
                </div>
                
                {devMessage && (
                  <p className="text-xs p-1 bg-gray-100 rounded">{devMessage}</p>
                )}
              </div>
            </div>
          )}
        </div>
      
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
      </div>
    </div>
  );
}