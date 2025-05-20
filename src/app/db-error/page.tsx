'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DatabaseErrorPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  
  // Check database connection on page load
  useEffect(() => {
    async function checkDatabase() {
      try {
        // Try to connect to the health check endpoint
        const response = await fetch('/api/health');
        
        if (response.ok) {
          const data = await response.json();
          setIsDatabaseConnected(data.database === 'connected');
        } else {
          setIsDatabaseConnected(false);
        }
      } catch (error) {
        console.error('Error checking database:', error);
        setIsDatabaseConnected(false);
      } finally {
        setIsChecking(false);
      }
    }
    
    checkDatabase();
    
    // Set up periodic checks
    const interval = setInterval(checkDatabase, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Database Connection Error</h1>
          
          <p className="mt-2 text-sm text-gray-600">
            We're having trouble connecting to our database. This might be due to:
          </p>
          
          <ul className="mt-2 text-sm text-left text-gray-600 space-y-1 pl-4 list-disc">
            <li>Temporary service disruption</li>
            <li>Database configuration issue</li>
            <li>Network connectivity problem</li>
          </ul>
        </div>
        
        <div className="p-4 border border-yellow-300 rounded-md bg-yellow-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Database Status</h3>
              <div className="mt-2 text-sm text-yellow-700">
                {isChecking ? (
                  <p className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking database connection...
                  </p>
                ) : isDatabaseConnected ? (
                  <p className="text-green-600">Database is now connected! You can try accessing the app again.</p>
                ) : (
                  <p>Database is still unavailable. Our team has been notified.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Link 
            href="/"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
          >
            Try Again
          </Link>
          
          <Link 
            href="/?bypass_auth=true"
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-center"
          >
            Emergency Access Mode
          </Link>
          
          <Link 
            href="/sign-in"
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
          >
            Go to Sign In
          </Link>
        </div>
        
        <p className="text-xs text-center text-gray-500">
          If this issue persists, please contact support.
        </p>
      </div>
    </div>
  );
}