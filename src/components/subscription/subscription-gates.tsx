'use client';

import React from 'react';
import { useSubscription, useHasFeatureAccess } from '@/hooks/use-subscription';
import Link from 'next/link';

/**
 * Component to render content only for subscribed users
 */
interface SubscriptionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'full' | 'compact';
}

export function SubscriptionGate({ children, fallback, mode = 'full' }: SubscriptionGateProps) {
  const { isSubscribed, isLoading } = useSubscription();
  
  if (isLoading) {
    return <div className="animate-pulse">Loading subscription status...</div>;
  }
  
  if (!isSubscribed) {
    if (mode === 'compact') {
      return fallback || (
        <div className="border border-amber-300 bg-amber-50 text-amber-800 p-2 rounded text-sm">
          <p>Subscription required. <Link href="/subscription" className="font-medium underline">Upgrade</Link></p>
        </div>
      );
    }
    
    return fallback || (
      <div className="border border-amber-300 bg-amber-50 text-amber-800 p-4 rounded">
        <h3 className="font-bold text-lg">Subscription Required</h3>
        <p>This feature requires an active subscription. Please upgrade to access.</p>
        <Link 
          href="/subscription" 
          className="mt-2 inline-block bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
        >
          View Subscription Options
        </Link>
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * Component to render content only for users with specific feature access
 */
interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: 'full' | 'compact' | 'disable';
  disabledClassName?: string;
}

export function FeatureGate({ 
  featureKey, 
  children, 
  fallback, 
  mode = 'full',
  disabledClassName 
}: FeatureGateProps) {
  const { hasAccess, isLoading } = useHasFeatureAccess(featureKey);
  
  if (isLoading) {
    return <div className="animate-pulse">Loading feature status...</div>;
  }
  
  if (!hasAccess) {
    if (mode === 'disable') {
      // Just render a disabled version of the child content
      return (
        <div 
          className={`pointer-events-none opacity-60 ${disabledClassName || ''}`}
          title={`Upgrade your subscription to access ${featureKey.replace(/_/g, ' ')}`}
        >
          {children}
          <div className="absolute inset-0 bg-transparent" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `/subscription?feature=${featureKey}`;
          }}></div>
        </div>
      );
    } else if (mode === 'compact') {
      return fallback || (
        <div className="border border-amber-300 bg-amber-50 text-amber-800 p-2 rounded text-sm">
          <p>
            Feature upgrade required. 
            <Link href={`/subscription?feature=${featureKey}`} className="font-medium underline ml-1">
              Upgrade
            </Link>
          </p>
        </div>
      );
    }
    
    return fallback || (
      <div className="border border-amber-300 bg-amber-50 text-amber-800 p-4 rounded">
        <h3 className="font-bold text-lg">Feature Upgrade Required</h3>
        <p>This feature requires a subscription upgrade. Please upgrade to access {featureKey.replace(/_/g, ' ')}.</p>
        <Link 
          href={`/subscription?feature=${featureKey}`}
          className="mt-2 inline-block bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
        >
          Upgrade Subscription
        </Link>
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * Button that triggers a subscription upgrade for a specific feature
 */
interface UpgradeButtonProps {
  featureKey: string;
  className?: string;
  children?: React.ReactNode;
}

export function UpgradeButton({ featureKey, className, children }: UpgradeButtonProps) {
  return (
    <Link
      href={`/subscription?feature=${featureKey}`}
      className={`inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-md hover:from-amber-600 hover:to-amber-700 transition-all ${className || ''}`}
    >
      {children || (
        <>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.07 4.93C20.9447 6.80528 21.9979 9.34836 22 12C22 14.6522 20.9464 17.1957 19.0711 19.0711" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 11.995C17.0039 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upgrade to Access
        </>
      )}
    </Link>
  );
}