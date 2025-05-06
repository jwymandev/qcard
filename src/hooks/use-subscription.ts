'use client';

import { useState, useEffect } from 'react';
import { SubscriptionInfo } from '@/lib/subscription-helpers';

/**
 * Hook to access the user's subscription status
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    async function fetchSubscription() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/user/subscription');
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription information');
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setSubscription(data);
          setError(null);
          
          // Set subscription cookie for middleware (edge runtime) use
          try {
            fetch('/api/user/subscription/set-cookie', { 
              method: 'POST',
              credentials: 'include'
            });
          } catch (cookieError) {
            console.error('Failed to set subscription cookie:', cookieError);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setSubscription(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchSubscription();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  return {
    subscription,
    isLoading,
    error,
    isSubscribed: subscription?.isSubscribed || false,
  };
}

/**
 * Hook for checking feature access
 */
export function useHasFeatureAccess(featureKey: string, fallback = false) {
  const [hasAccess, setHasAccess] = useState<boolean>(fallback);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let isMounted = true;
    
    async function checkFeatureAccess() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/user/features/${featureKey}`);
        
        if (!response.ok) {
          throw new Error(`Failed to check feature access for ${featureKey}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setHasAccess(data.hasAccess);
        }
      } catch (error) {
        console.error('Error checking feature access:', error);
        if (isMounted) {
          setHasAccess(fallback);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    checkFeatureAccess();
    
    return () => {
      isMounted = false;
    };
  }, [featureKey, fallback]);
  
  return { hasAccess, isLoading };
}