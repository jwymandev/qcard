'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function TalentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Skip if still loading or no session available
    if (status === 'loading') return;
    
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        setError(null);
        
        if (status === 'unauthenticated') {
          console.log("User is not authenticated, redirecting to sign-in");
          router.push('/sign-in');
          return;
        }
        
        if (!session?.user?.id) {
          console.log("Session missing user ID");
          setError("Session data is missing. Please sign in again.");
          setIsLoading(false);
          return;
        }
        
        // Check if we already know the tenant type from the session
        if (session.user.tenantType && session.user.tenantType !== 'TALENT') {
          console.log("User is not a talent account, redirecting");
          router.push('/studio/dashboard');
          return;
        }
        
        console.log("Fetching profile data for talent dashboard");
        
        // Get profile data
        try {
          const profileResponse = await fetch('/api/talent/profile');
          
          if (profileResponse.ok) {
            setProfileData(await profileResponse.json());
          } else if (profileResponse.status === 404) {
            // Profile needs initialization but that's OK for now
            console.log("Profile not found (needs initialization)");
          } else {
            console.error("Error fetching profile:", await profileResponse.text());
          }
        } catch (profileError) {
          console.error("Profile fetch error:", profileError);
          // Don't block dashboard on profile error
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Dashboard initialization error:", error);
        setError("Failed to load dashboard data. Please refresh the page.");
        setIsLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [status, session, router]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 p-4 rounded-md shadow border border-red-200 mb-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => router.push('/sign-in')}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Talent Dashboard</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Welcome, {session?.user?.name || 'Talent'}
        </h2>
        <p className="text-gray-600">
          Manage your profile, applications, and projects from this dashboard.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-md shadow">
          <h3 className="font-medium text-lg mb-2">Your Profile</h3>
          <p className="text-gray-600 mb-3">
            Update your profile and preferences
          </p>
          <Link 
            href="/talent/profile" 
            className="text-blue-600 hover:text-blue-800"
          >
            Edit Profile →
          </Link>
        </div>
        
        <div className="bg-green-50 p-4 rounded-md shadow">
          <h3 className="font-medium text-lg mb-2">Casting Opportunities</h3>
          <p className="text-gray-600 mb-3">
            Browse available casting calls
          </p>
          <Link 
            href="/talent/opportunities" 
            className="text-green-600 hover:text-green-800"
          >
            View Opportunities →
          </Link>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-md shadow">
          <h3 className="font-medium text-lg mb-2">Your Applications</h3>
          <p className="text-gray-600 mb-3">
            Check the status of your applications
          </p>
          <Link 
            href="/talent/applications" 
            className="text-purple-600 hover:text-purple-800"
          >
            View Applications →
          </Link>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-md shadow">
          <h3 className="font-medium text-lg mb-2">Projects</h3>
          <p className="text-gray-600 mb-3">
            View projects you&apos;re involved in
          </p>
          <Link 
            href="/talent/projects" 
            className="text-orange-600 hover:text-orange-800"
          >
            View Projects →
          </Link>
        </div>
        
        <div className="bg-teal-50 p-4 rounded-md shadow">
          <h3 className="font-medium text-lg mb-2">Messages</h3>
          <p className="text-gray-600 mb-3">
            Communicate with studios and casting directors
          </p>
          <Link 
            href="/talent/messages" 
            className="text-teal-600 hover:text-teal-800"
          >
            View Messages →
          </Link>
        </div>
        
        <div className="bg-red-50 p-4 rounded-md shadow">
          <h3 className="font-medium text-lg mb-2">Calendar</h3>
          <p className="text-gray-600 mb-3">
            Manage your availability and bookings
          </p>
          <Link 
            href="/talent/calendar" 
            className="text-red-600 hover:text-red-800"
          >
            View Calendar →
          </Link>
        </div>
      </div>
    </div>
  );
}