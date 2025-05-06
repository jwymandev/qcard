'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Location {
  id: string;
  name: string;
}

interface SubscriptionFormProps {
  locations: Location[];
}

export default function SubscriptionForm({ locations }: SubscriptionFormProps) {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const basePrice = 19.99;
  const additionalLocationPrice = 9.99;
  
  const totalPrice = selectedLocations.length > 0
    ? basePrice + ((selectedLocations.length - 1) * additionalLocationPrice)
    : 0;

  const handleLocationChange = (locationId: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedLocations.length === 0) {
      alert('Please select at least one location');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Real checkout using the new subscription endpoint
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: 'basic',  // Basic plan with locations
          locationIds: selectedLocations,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to set up subscription. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Available Locations</h3>
        <div className="grid grid-cols-2 gap-3">
          {locations.map((location) => (
            <div key={location.id} className="flex items-center">
              <input
                type="checkbox"
                id={`location-${location.id}`}
                value={location.id}
                checked={selectedLocations.includes(location.id)}
                onChange={() => handleLocationChange(location.id)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor={`location-${location.id}`} className="ml-2 text-gray-700">
                {location.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex justify-between mb-1">
          <span>Base price (first location)</span>
          <span>${basePrice.toFixed(2)}</span>
        </div>
        {selectedLocations.length > 1 && (
          <div className="flex justify-between mb-1">
            <span>Additional locations ({selectedLocations.length - 1} × ${additionalLocationPrice.toFixed(2)})</span>
            <span>${((selectedLocations.length - 1) * additionalLocationPrice).toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-semibold">
          <span>Total monthly price</span>
          <span>${totalPrice.toFixed(2)}/month</span>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-blue-800 mb-4">
        <h4 className="font-medium mb-1">Basic Plan Features</h4>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Access to selected locations</li>
          <li>Basic messaging (20 messages/month)</li>
          <li>Talent profile visibility</li>
          <li>Apply to casting calls</li>
          <li>7-day free trial</li>
        </ul>
      </div>
      
      <button
        type="submit"
        disabled={isLoading || selectedLocations.length === 0}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Start Free Trial'}
      </button>
      
      <p className="text-xs text-gray-500 text-center mt-2">
        By subscribing, you agree to our terms of service and privacy policy.
        Your subscription will renew automatically, and you can cancel anytime.
      </p>
    </form>
  );
}