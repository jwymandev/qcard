'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSubscription } from '@/hooks/use-subscription';
import RegionSubscriptionForm from './region-subscription-form';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
}

interface Region {
  id: string;
  name: string;
  description?: string;
}

// Loading fallback for Suspense
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

function SubscriptionContent() {
  const { data: session, status } = useSession();
  const { subscription, isLoading: subscriptionLoading } = useSubscription();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('regions'); // Default to new region-based plans
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Check for returnUrl and highlight required feature
  const returnUrl = searchParams.get('returnUrl');
  const requiredFeature = searchParams.get('feature');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/sign-in?callbackUrl=' + encodeURIComponent('/subscription');
    } else if (status === 'authenticated') {
      loadData();
    }
  }, [status]);
  
  // Function to load subscription plans and regions
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch standard subscription plans
      const plansResponse = await fetch('/api/plans');
      const plansData = await plansResponse.json();
      setPlans(plansData);
      
      // Fetch regions
      const regionsResponse = await fetch('/api/regions');
      const regionsData = await regionsResponse.json();
      setRegions(regionsData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      // Set default plans if API fails
      setPlans([
        {
          id: 'basic',
          name: 'Basic',
          description: 'Access to one filming region',
          price: 19.99,
          features: ['Access to one filming region', 'Basic messaging']
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'Access to all regions and premium features',
          price: 39.99,
          features: [
            'Access to all regions', 
            'Unlimited messaging', 
            'Advanced talent search',
            'Custom questionnaires'
          ]
        },
        {
          id: 'business',
          name: 'Business',
          description: 'Everything in Pro plus enterprise features',
          price: 99.99,
          features: [
            'Everything in Professional plan',
            'External actor management',
            'Advanced analytics',
            'Priority support'
          ]
        }
      ]);
      
      // Set default regions if API fails
      setRegions([
        { id: 'west', name: 'West Coast', description: 'California, Oregon, Washington, etc.' },
        { id: 'southwest', name: 'Southwest', description: 'Arizona, New Mexico, Nevada, etc.' },
        { id: 'mountain', name: 'Mountain West', description: 'Colorado, Utah, Wyoming, etc.' },
        { id: 'midwest', name: 'Midwest', description: 'Illinois, Michigan, Ohio, etc.' },
        { id: 'southeast', name: 'Southeast', description: 'Georgia, Florida, North Carolina, etc.' },
        { id: 'northeast', name: 'Northeast', description: 'New York, Massachusetts, etc.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isSubscribed = subscription?.isSubscribed || false;
  const currentPlan = subscription?.plan;
  const renewalDate = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString() 
    : null;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;
  
  // Handle loading state
  if (isLoading || subscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Handle tab switching
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      try {
        await fetch('/api/user/subscription/cancel', {
          method: 'POST',
        });
        
        // Refresh the page to show updated status
        window.location.reload();
      } catch (error) {
        console.error('Error canceling subscription:', error);
        alert('Failed to cancel subscription. Please try again later.');
      }
    }
  };
  
  // Handle resume subscription
  const handleResumeSubscription = async () => {
    try {
      await fetch('/api/user/subscription/resume', {
        method: 'POST',
      });
      
      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error resuming subscription:', error);
      alert('Failed to resume subscription. Please try again later.');
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {isSubscribed ? 'Manage Subscription' : 'Choose Your Subscription'}
      </h1>
      
      {requiredFeature && !isSubscribed && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 text-amber-800">
          <h2 className="font-semibold text-lg mb-1">Premium Feature Required</h2>
          <p>
            The feature you tried to access ({requiredFeature.replace(/_/g, ' ')}) 
            requires a subscription. Choose a plan below to unlock this feature.
          </p>
        </div>
      )}
      
      {isSubscribed ? (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold">Current Subscription</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-green-800">Active Subscription</h3>
                    <p className="text-green-700">
                      {cancelAtPeriodEnd 
                        ? `Your subscription will end on ${renewalDate}`
                        : `Your subscription will renew on ${renewalDate}`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Plan Details</h3>
                  <ul className="space-y-3">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Plan</span>
                      <span className="font-medium">{currentPlan?.name || 'Standard'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Price</span>
                      <span className="font-medium">${currentPlan?.price.toFixed(2) || '0.00'}/month</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="font-medium">
                        {cancelAtPeriodEnd 
                          ? <span className="text-amber-600">Cancels at period end</span>
                          : <span className="text-green-600">Active</span>
                        }
                      </span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Subscription Management</h3>
                  <div className="space-y-3">
                    {!cancelAtPeriodEnd ? (
                      <button 
                        onClick={handleCancelSubscription}
                        className="block w-full py-2 px-4 border border-gray-300 rounded-md text-center text-red-600 hover:bg-red-50 transition"
                      >
                        Cancel Subscription
                      </button>
                    ) : (
                      <button 
                        onClick={handleResumeSubscription}
                        className="block w-full py-2 px-4 bg-blue-600 text-white rounded-md text-center hover:bg-blue-700 transition"
                      >
                        Resume Subscription
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setActiveTab('plans')}
                      className="block w-full py-2 px-4 border border-gray-300 rounded-md text-center text-gray-700 hover:bg-gray-50 transition"
                    >
                      Change Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Available plans section if they want to change their plan */}
          {activeTab === 'plans' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold">Available Plans</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upgrade or change your subscription plan
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id}
                      className={`border rounded-lg p-5 ${
                        currentPlan?.id === plan.id 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-2xl font-bold mt-2 mb-2">${plan.price.toFixed(2)}<span className="text-sm font-normal text-gray-500">/month</span></p>
                      <p className="text-gray-600 mb-4">{plan.description}</p>
                      
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {currentPlan?.id === plan.id ? (
                        <button
                          disabled
                          className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 opacity-50 cursor-not-allowed"
                        >
                          Current Plan
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // Switch to the custom plan view if this plan supports location selection
                            if (plan.id === 'basic') {
                              setActiveTab('custom');
                            } else {
                              // Otherwise just redirect to checkout for this plan
                              window.location.href = `/api/create-subscription?planId=${plan.id}`;
                            }
                          }}
                          className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Custom location-based plan */}
          {activeTab === 'custom' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold">Customize Your Plan</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select the locations you want to access
                </p>
              </div>
              
              <div className="p-6">
                {/* TODO: Replace with region-based form */}
                <RegionSubscriptionForm regions={regions} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Subscription Plans</h2>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleTabChange('regions')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'regions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Region-Based
                </button>
                
                <button
                  onClick={() => handleTabChange('plans')}
                  className={`px-4 py-2 rounded-md ${
                    activeTab === 'plans'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Standard Plans
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'regions' ? (
              <div>
                <p className="mb-6 text-gray-600">
                  Select the filming regions where you want to receive casting opportunities.
                  Subscribe to multiple regions for a better price!
                </p>
                
                <RegionSubscriptionForm regions={regions} />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div 
                    key={plan.id}
                    className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition"
                  >
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold mt-2 mb-2">${plan.price.toFixed(2)}<span className="text-sm font-normal text-gray-500">/month</span></p>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => {
                        if (plan.id === 'basic') {
                          // For basic plan, switch to region-based selection
                          setActiveTab('regions');
                        } else {
                          // For other plans, go directly to checkout
                          window.location.href = `/api/create-subscription?planId=${plan.id}`;
                        }
                      }}
                      className="w-full py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 transition"
                    >
                      Select Plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionContent />
    </Suspense>
  );
}