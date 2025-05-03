'use client';

import React, { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import SubscriptionForm from './subscription-form';
import { useSession } from 'next-auth/react';

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/sign-in';
    } else if (status === 'authenticated') {
      setIsLoading(false);
    }
  }, [status]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  // Mock locations for development until database is set up
  const locations = [
    { id: 'loc1', name: 'Los Angeles' },
    { id: 'loc2', name: 'New York' },
    { id: 'loc3', name: 'Atlanta' },
    { id: 'loc4', name: 'Vancouver' },
    { id: 'loc5', name: 'London' }
  ];
  
  // Mock subscription data
  const hasActiveSubscription = false;
  const currentLocations = [];
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Subscription</h1>
      
      {hasActiveSubscription ? (
        <div className="bg-green-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Active Subscription</h2>
          <p className="mb-4">You have an active subscription for the following locations:</p>
          <ul className="list-disc list-inside">
            {currentLocations.map((location) => (
              <li key={location.id}>{location.name}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Select Locations</h2>
          <p className="mb-6 text-gray-600">
            Choose the locations where you'd like to be considered for casting opportunities.
            Pricing is based on the number of locations selected.
          </p>
          
          <SubscriptionForm locations={locations} />
        </div>
      )}
    </div>
  );
}