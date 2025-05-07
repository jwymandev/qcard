'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Region {
  id: string;
  name: string;
  description?: string;
}

interface RegionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  region: {
    id: string;
    name: string;
    description?: string;
  };
  features: string[];
}

interface RegionSubscriptionFormProps {
  regions: Region[];
}

export default function RegionSubscriptionForm({ regions }: RegionSubscriptionFormProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regionPlans, setRegionPlans] = useState<Record<string, RegionPlan>>({});
  const [discount, setDiscount] = useState<{ percentage: number, amount: number }>({ percentage: 0, amount: 0 });
  const router = useRouter();
  
  // Fetch region plans on load
  useEffect(() => {
    fetchRegionPlans();
  }, []);
  
  // Fetch discount when selected regions change
  useEffect(() => {
    if (selectedRegions.length > 1) {
      fetchDiscount(selectedRegions.length);
    } else {
      setDiscount({ percentage: 0, amount: 0 });
    }
  }, [selectedRegions]);
  
  const fetchRegionPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await fetch('/api/plans/regional');
      if (!response.ok) {
        throw new Error('Failed to fetch region plans');
      }
      
      const data = await response.json();
      
      // Convert to a map keyed by region ID for easy access
      const plansByRegion: Record<string, RegionPlan> = {};
      data.forEach((plan: RegionPlan) => {
        plansByRegion[plan.region.id] = plan;
      });
      
      setRegionPlans(plansByRegion);
      setLoadingPlans(false);
    } catch (error) {
      console.error('Error loading region plans:', error);
      setError('Failed to load region plans. Please try again later.');
      setLoadingPlans(false);
    }
  };
  
  const fetchDiscount = async (regionCount: number) => {
    try {
      const response = await fetch('/api/plans/regional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ regionCount }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch discount');
      }
      
      const data = await response.json();
      setDiscount({ 
        percentage: data.discountPercentage,
        amount: data.discountAmount
      });
    } catch (error) {
      console.error('Error fetching discount:', error);
      // Silently fail, default to no discount
      setDiscount({ percentage: 0, amount: 0 });
    }
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegions(prev => {
      if (prev.includes(regionId)) {
        return prev.filter(id => id !== regionId);
      } else {
        return [...prev, regionId];
      }
    });
  };
  
  // Calculate total price
  const calculateSubtotal = () => {
    return selectedRegions.reduce((sum, regionId) => {
      const plan = regionPlans[regionId];
      return sum + (plan ? plan.price : 0);
    }, 0);
  };
  
  const subtotal = calculateSubtotal();
  const discountAmount = subtotal * discount.amount;
  const totalPrice = subtotal - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRegions.length === 0) {
      setError('Please select at least one region');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create checkout session with selected regions
      const response = await fetch('/api/create-region-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regionIds: selectedRegions,
          // Include discount info if applicable
          discount: discount.percentage > 0 ? {
            percentage: discount.percentage,
            amount: discountAmount
          } : undefined
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError('Failed to set up subscription. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingPlans) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading subscription options...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
          <button 
            type="button"
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="text-red-500">×</span>
          </button>
        </div>
      )}
      
      <div>
        <h3 className="text-xl font-medium mb-4">Select Your Filming Regions</h3>
        <p className="text-gray-600 mb-6">
          Choose the regions where you want to receive casting opportunities. 
          Subscribe to multiple regions and get a discount!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regions.map((region) => {
            const plan = regionPlans[region.id];
            
            return (
              <div 
                key={region.id} 
                className={`border rounded-lg p-4 ${
                  selectedRegions.includes(region.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id={`region-${region.id}`}
                    value={region.id}
                    checked={selectedRegions.includes(region.id)}
                    onChange={() => handleRegionChange(region.id)}
                    className="h-5 w-5 mt-1 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <label htmlFor={`region-${region.id}`} className="block text-lg font-medium text-gray-900">
                      {region.name}
                    </label>
                    {region.description && (
                      <p className="text-sm text-gray-500 mt-1">{region.description}</p>
                    )}
                    
                    {plan && (
                      <p className="text-lg font-bold text-blue-600 mt-2">
                        ${plan.price.toFixed(2)}/month
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-md">
        <h4 className="font-medium text-lg mb-4">Subscription Summary</h4>
        
        {selectedRegions.length > 0 ? (
          <>
            <div className="space-y-2 mb-4">
              {selectedRegions.map(regionId => {
                const plan = regionPlans[regionId];
                const region = regions.find(r => r.id === regionId);
                
                return plan && region ? (
                  <div key={regionId} className="flex justify-between">
                    <span>{region.name} Region</span>
                    <span>${plan.price.toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
            
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              {discount.percentage > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Multi-region discount ({discount.percentage}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total monthly price</span>
                <span>${totalPrice.toFixed(2)}/month</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 italic">
            Select at least one region to see pricing
          </p>
        )}
      </div>
      
      <div className="bg-blue-50 p-6 rounded-md border border-blue-100 text-blue-800">
        <h4 className="font-semibold text-lg mb-2">Plan Features</h4>
        <ul className="space-y-2 mb-4">
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Access to casting calls in selected regions</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Unlimited applications</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Messaging with casting directors</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Enhanced profile visibility to casting directors</span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>7-day free trial</span>
          </li>
          {selectedRegions.length > 1 && (
            <li className="flex items-start text-green-700 font-medium">
              <svg className="h-5 w-5 text-green-600 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Multi-region discount: <strong>{discount.percentage}% off</strong></span>
            </li>
          )}
        </ul>
        
        <p className="text-sm italic">
          Cancel anytime. No long-term commitment required.
        </p>
      </div>
      
      <button
        type="submit"
        disabled={isLoading || selectedRegions.length === 0}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 font-medium text-lg"
      >
        {isLoading ? 'Processing...' : 'Subscribe Now'}
      </button>
      
      <p className="text-xs text-gray-500 text-center mt-2">
        By subscribing, you agree to our terms of service and privacy policy.
        Your subscription will renew automatically at the end of your free trial.
      </p>
    </form>
  );
}