import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureHttps } from './lib/utils';

/**
 * List of paths that require an active subscription
 * This can be extended with more specific premium feature paths
 */
const SUBSCRIPTION_REQUIRED_PATHS = [
  '/studio/talent-search',         // Advanced talent search requires subscription
  '/studio/external-actors',       // External actor management requires subscription
  '/talent/questionnaires',        // Accessing questionnaires requires subscription
];

// Features that require specific subscription tiers or features
const PREMIUM_FEATURE_PATHS: Record<string, string> = {
  '/studio/projects': 'multi_project_management',
  '/studio/questionnaires': 'custom_questionnaires',
  '/talent/messages': 'unlimited_messaging'
};

// This file is a blueprint for when you want to add subscription-based access control
// You will need to uncomment and integrate this with your main middleware.ts file
// For now, we'll export a simple function that doesn't actually check anything

/**
 * Example middleware to check if a route requires subscription
 * This should be merged with your main middleware when ready
 */
export async function checkSubscriptionAccess(request: NextRequest): Promise<NextResponse | null> {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Skip middleware for non-protected paths
  if (
    path.startsWith('/api/') || 
    path.includes('_next') || 
    path.includes('favicon.ico') ||
    path === '/' ||
    path === '/sign-in' || 
    path === '/sign-up' ||
    path === '/subscription' ||
    path === '/unauthorized' ||
    path.includes('.')  // Skip files with extensions
  ) {
    return null; // Continue with normal flow
  }
  
  // Check if the path requires subscription or premium features
  const requiresSubscription = SUBSCRIPTION_REQUIRED_PATHS.some(
    (restrictedPath) => path.startsWith(restrictedPath)
  );
  
  // Check for premium feature path matches
  const premiumFeatureKey = Object.keys(PREMIUM_FEATURE_PATHS).find(
    (restrictedPath) => path.startsWith(restrictedPath)
  );
  
  // Skip if path doesn't need subscription checks
  if (!requiresSubscription && !premiumFeatureKey) {
    return null; // Continue with normal flow
  }
  
  try {
    // Extract the host from the request headers, not the URL
    const host = request.headers.get('host') || '';
    // Determine protocol based on request URL
    const protocol = request.url.startsWith('https') ? 'https' : 'http';
    // Build the correct origin using host header
    const origin = `${protocol}://${host}`;
    const apiUrl = `${origin}/api/user/subscription`;
    
    console.log(`Making subscription request to: ${apiUrl} (host: ${host})`);
    
    const subscriptionCheck = await fetch(apiUrl, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (!subscriptionCheck.ok) {
      // If unauthorized, redirect to login
      if (subscriptionCheck.status === 401) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
      
      // For other errors, allow access (fail open for now)
      console.error('Error checking subscription status:', await subscriptionCheck.text());
      return null;
    }
    
    const subscriptionData = await subscriptionCheck.json();
    const isSubscribed = subscriptionData.isSubscribed;
    
    // If subscription is required and user is not subscribed, redirect to subscription page
    if (requiresSubscription && !isSubscribed) {
      // Add current path as return URL
      const subscriptionUrl = new URL('/subscription', request.url);
      subscriptionUrl.searchParams.set('returnUrl', path);
      
      return NextResponse.redirect(subscriptionUrl);
    }
    
    // If premium feature is required, check feature access
    if (premiumFeatureKey && !isSubscribed) {
      const featureKey = PREMIUM_FEATURE_PATHS[premiumFeatureKey];
      
      // Extract host from headers for correct domain
      const host = request.headers.get('host') || '';
      // Determine protocol based on request URL
      const protocol = request.url.startsWith('https') ? 'https' : 'http';
      // Build the correct origin using host header
      const origin = `${protocol}://${host}`;
      const apiUrl = `${origin}/api/user/features/${featureKey}`;
      
      console.log(`Making feature check request to: ${apiUrl} (host: ${host})`);
      
      const featureCheck = await fetch(apiUrl, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });
      
      if (featureCheck.ok) {
        const { hasAccess } = await featureCheck.json();
        
        if (!hasAccess) {
          // User doesn't have access to this premium feature, redirect to subscription page
          const subscriptionUrl = new URL('/subscription', request.url);
          subscriptionUrl.searchParams.set('returnUrl', path);
          subscriptionUrl.searchParams.set('feature', featureKey);
          
          return NextResponse.redirect(subscriptionUrl);
        }
      }
    }
  } catch (error) {
    // Log error and fail open (allow access) to prevent blocking users due to server errors
    console.error('Error in subscription middleware:', error);
  }
  
  // Allow access if all checks passed or if there was an error
  return null; // Continue with normal flow
}

// When ready to integrate, uncomment this middleware function
/*
export async function middleware(request: NextRequest) {
  // Check subscription access
  const subscriptionResponse = await checkSubscriptionAccess(request);
  if (subscriptionResponse) {
    return subscriptionResponse;
  }
  
  // Continue with normal flow
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/studio/talent-search/:path*',
    '/studio/external-actors/:path*',
    '/studio/projects/:path*',
    '/studio/questionnaires/:path*',
    '/talent/questionnaires/:path*',
    '/talent/messages/:path*',
  ],
};
*/