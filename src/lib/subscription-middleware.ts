import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ensureHttps } from './utils';

// Paths that require a subscription
const SUBSCRIPTION_PROTECTED_PATHS = [
  // Studio features
  // '/studio/talent-search', // Temporarily removed to allow testing
  '/studio/questionnaires',
  '/studio/casting-calls',
  
  // Talent features
  '/talent/questionnaires',
  
  // Admin features requiring subscription
  '/admin/settings',
];

// Features that require a subscription (used for client-side checks)
export const SUBSCRIPTION_FEATURES = {
  ADVANCED_SEARCH: 'advanced_search',
  QUESTIONNAIRES: 'questionnaires',
  UNLIMITED_MESSAGES: 'unlimited_messages',
  MULTIPLE_PROJECTS: 'multiple_projects',
  CASTING_CALLS: 'casting_calls',
  CUSTOM_BRANDING: 'custom_branding',
};

/**
 * Edge-compatible middleware helper that checks if the path requires a subscription
 * Note: This is simplified for Edge compatibility - actual subscription status 
 * will be checked by the API route or page, not in middleware
 */
export async function checkSubscriptionAccess(req: NextRequest) {
  const token = await getToken({ req });
  
  // If no token or not authenticated, let the auth middleware handle it
  if (!token?.sub) {
    return false;
  }
  
  const path = req.nextUrl.pathname;
  
  // Check if this path requires a subscription
  const requiresSubscription = SUBSCRIPTION_PROTECTED_PATHS.some(
    protectedPath => path.startsWith(protectedPath)
  );
  
  if (!requiresSubscription) {
    return true; // No subscription needed for this path
  }
  
  // Check for subscription in token or cookie
  // This is simplified - we'll just check if the user has a role that might have subscription
  // Actual validation will happen in API or page
  const hasBasicAccess = token.role === 'ADMIN' || token.role === 'SUPER_ADMIN';
  
  // Read subscription status cookie if it exists
  const subscriptionCookie = req.cookies.get('subscription_status');
  const hasSubscriptionCookie = subscriptionCookie?.value === 'active';
  
  return hasBasicAccess || hasSubscriptionCookie;
}

/**
 * Redirects to subscription page if user doesn't have an active subscription
 */
export function redirectToSubscription(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/subscription';
  url.searchParams.set('from', req.nextUrl.pathname);
  
  console.log(`Redirecting to subscription page: ${url.toString()}`);
  return NextResponse.redirect(url);
}

/**
 * Helper to use in the main middleware.ts file
 */
export async function handleSubscriptionCheck(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname;
    
    // Skip subscription check for public paths
    if (
      path === '/subscription' ||
      path === '/sign-in' ||
      path === '/sign-up' ||
      path === '/'
    ) {
      return null;
    }
    
    // Check if the path requires subscription
    const requiresSubscription = SUBSCRIPTION_PROTECTED_PATHS.some(
      protectedPath => path.startsWith(protectedPath)
    );
    
    // If the path doesn't require subscription, continue
    if (!requiresSubscription) {
      return null;
    }
    
    // Get the token
    const token = await getToken({ req });
    if (!token?.sub) {
      // Not authenticated, let the auth middleware handle it
      return null;
    }
    
    // Check for admin users (always allow access)
    if (token.role === 'ADMIN' || token.role === 'SUPER_ADMIN') {
      return null;
    }
    
    // Check subscription cookie
    const subscriptionCookie = req.cookies.get('subscription_status');
    if (subscriptionCookie?.value === 'active') {
      return null;
    }
    
    // Skip subscription check only in explicitly marked development environment
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_SUBSCRIPTION_CHECK === 'true') {
      console.log('Development environment: Skipping subscription check');
      return null;
    }
    
    // Redirect to subscription page if checks fail
    return redirectToSubscription(req);
  } catch (error) {
    console.error('Error in subscription middleware:', error);
    // On error, allow the request to continue to prevent blocking users
    return null;
  }
}