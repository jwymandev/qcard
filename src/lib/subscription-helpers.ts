import { prisma } from '@/lib/db';
import { cache } from 'react';

/**
 * Types for subscription status checking
 */
export type SubscriptionStatus = 
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'UNPAID';

export type SubscriptionInfo = {
  isSubscribed: boolean;
  status: SubscriptionStatus | null;
  plan: {
    id: string;
    name: string;
    price: number;
  } | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  features: Record<string, any> | null;
};

/**
 * Get a user's subscription status
 * Returns subscription info or null if not subscribed
 */
export const getUserSubscription = cache(async (userId: string): Promise<SubscriptionInfo> => {
  try {
    // Get active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
      include: {
        plan: true,
        features: true
      },
      orderBy: {
        currentPeriodEnd: 'desc'
      }
    });
    
    if (!subscription) {
      return {
        isSubscribed: false,
        status: null,
        plan: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        features: null
      };
    }
    
    // Format subscription features into a key-value object
    const featuresMap = subscription.features?.reduce<Record<string, any>>((acc, feature) => {
      acc[feature.featureKey] = feature.featureValue;
      return acc;
    }, {}) || null;
    
    return {
      isSubscribed: ['ACTIVE', 'TRIALING'].includes(subscription.status),
      status: subscription.status as SubscriptionStatus,
      plan: subscription.plan ? {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: subscription.plan.price
      } : null,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      features: featuresMap
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return {
      isSubscribed: false,
      status: null,
      plan: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      features: null
    };
  }
});

/**
 * Get a studio's subscription status
 */
export const getStudioSubscription = cache(async (studioId: string): Promise<SubscriptionInfo> => {
  try {
    // Get active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        studioId,
        status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
      },
      include: {
        plan: true,
        features: true
      },
      orderBy: {
        currentPeriodEnd: 'desc'
      }
    });
    
    if (!subscription) {
      return {
        isSubscribed: false,
        status: null,
        plan: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        features: null
      };
    }
    
    // Format subscription features into a key-value object
    const featuresMap = subscription.features?.reduce<Record<string, any>>((acc, feature) => {
      acc[feature.featureKey] = feature.featureValue;
      return acc;
    }, {}) || null;
    
    return {
      isSubscribed: ['ACTIVE', 'TRIALING'].includes(subscription.status),
      status: subscription.status as SubscriptionStatus,
      plan: subscription.plan ? {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: subscription.plan.price
      } : null,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      features: featuresMap
    };
  } catch (error) {
    console.error('Error getting studio subscription:', error);
    return {
      isSubscribed: false,
      status: null,
      plan: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      features: null
    };
  }
});

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(
  userId: string,
  featureKey: string,
  defaultValue = false
): Promise<boolean> {
  try {
    // First check if feature exists in global feature flags
    const featureFlag = await prisma.featureFlag.findUnique({
      where: { key: featureKey }
    });
    
    // If feature doesn't exist, use default value
    if (!featureFlag) {
      return defaultValue;
    }
    
    // If feature is enabled for everyone, allow access
    if (featureFlag.defaultValue) {
      return true;
    }
    
    // Check if user has active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        features: {
          where: { featureKey }
        }
      }
    });
    
    // No subscription means no premium features
    if (!subscription) {
      return false;
    }
    
    // Check if the subscription has this specific feature
    const feature = subscription.features.find(f => f.featureKey === featureKey);
    
    if (!feature) {
      // Check if the subscription plan includes this feature
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscription.planId }
      });
      
      if (plan?.features) {
        // Check if feature is included in plan's feature list
        const planFeatures = plan.features as any;
        return Array.isArray(planFeatures) && planFeatures.includes(featureKey);
      }
      
      return false;
    }
    
    // Feature exists, check its value
    try {
      // Feature might be a boolean, string, number, or object
      const featureValue = feature.featureValue as any;
      return typeof featureValue === 'boolean' ? featureValue : !!featureValue;
    } catch (e) {
      return false;
    }
  } catch (error) {
    console.error(`Error checking feature access for ${featureKey}:`, error);
    return defaultValue;
  }
}

/**
 * Client hook for checking feature access
 * (Note: This would be in a separate client-side file)
 */
/*
import { useState, useEffect } from 'react';

export function useHasFeatureAccess(featureKey: string, fallback = false) {
  const [hasAccess, setHasAccess] = useState<boolean>(fallback);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    async function checkFeatureAccess() {
      try {
        const response = await fetch(`/api/user/features/${featureKey}`);
        if (response.ok) {
          const data = await response.json();
          setHasAccess(data.hasAccess);
        } else {
          setHasAccess(fallback);
        }
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkFeatureAccess();
  }, [featureKey, fallback]);
  
  return { hasAccess, isLoading };
}
*/