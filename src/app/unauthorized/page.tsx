'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-100">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            ></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don&apos;t have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        
        {session ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded text-sm text-left">
              <p><strong>User:</strong> {session.user.email}</p>
              <p><strong>Role:</strong> {session.user.role}</p>
              <p><strong>Type:</strong> {session.user.tenantType}</p>
            </div>
            
            <div className="mt-6 flex flex-col space-y-3">
              {session.user.tenantType === 'STUDIO' ? (
                <Link 
                  href="/studio/dashboard" 
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Return to Studio Dashboard
                </Link>
              ) : (
                <Link
                  href="/talent/dashboard"
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Return to Talent Dashboard
                </Link>
              )}
              
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}