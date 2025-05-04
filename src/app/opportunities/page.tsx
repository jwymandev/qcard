'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock data for opportunities
const opportunities = [
  {
    id: 'op1',
    title: 'Background Extras for Historical Drama',
    location: 'New York',
    studio: 'Paramount Productions',
    date: 'Jun 15-20, 2025',
    description: 'Seeking extras for a period drama set in the 1920s. Looking for all ages and ethnicities.',
    compensation: '$150/day'
  },
  {
    id: 'op2',
    title: 'Crowd Scene for Superhero Movie',
    location: 'Los Angeles',
    studio: 'Marvel Studios',
    date: 'Jul 10-12, 2025',
    description: 'Need 100+ extras for big crowd scene. Casual modern clothing required.',
    compensation: '$200/day'
  },
  {
    id: 'op3',
    title: 'Restaurant Patrons for TV Comedy',
    location: 'Atlanta',
    studio: 'Sunshine Productions',
    date: 'Jun 5-6, 2025',
    description: 'Casting for restaurant patrons in upscale dining scene. Business attire required.',
    compensation: '$125/day'
  },
  {
    id: 'op4',
    title: 'Street Scene for Action Film',
    location: 'Vancouver',
    studio: 'Blue Sky Films',
    date: 'Aug 18-20, 2025',
    description: 'Downtown street scene requiring 50+ extras. Comfortable walking shoes recommended.',
    compensation: '$175/day'
  }
];

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, router]);
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Only render content if authenticated
  if (status !== 'authenticated') {
    return null;
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Casting Opportunities</h1>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <span className="text-gray-600">{opportunities.length} opportunities found</span>
        </div>
        
        <div className="flex space-x-2">
          <select className="border rounded px-3 py-1">
            <option>All Locations</option>
            <option>Los Angeles</option>
            <option>New York</option>
            <option>Atlanta</option>
            <option>Vancouver</option>
          </select>
          
          <select className="border rounded px-3 py-1">
            <option>All Dates</option>
            <option>Next 7 Days</option>
            <option>Next 30 Days</option>
            <option>Next 90 Days</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-6">
        {opportunities.map((opportunity) => (
          <div key={opportunity.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{opportunity.title}</h2>
                <div className="flex space-x-4 text-sm text-gray-600 mt-1">
                  <div>{opportunity.studio}</div>
                  <div>{opportunity.location}</div>
                  <div>{opportunity.date}</div>
                </div>
              </div>
              <div className="text-lg font-medium text-green-600">
                {opportunity.compensation}
              </div>
            </div>
            
            <p className="mt-4 text-gray-700">{opportunity.description}</p>
            
            <div className="mt-4 flex justify-end">
              <Link 
                href={`/opportunities/${opportunity.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <Link 
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}