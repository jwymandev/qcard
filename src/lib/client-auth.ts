'use client';

/**
 * Client-side authentication utilities to avoid server-side imports in client components
 * This prevents webpack errors with server-only packages like bcrypt
 */

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

export type SignInOptions = {
  email: string;
  password: string;
  redirect?: boolean;
  callbackUrl?: string;
};

export interface SignInResponse {
  error?: string;
  status?: number;
  ok?: boolean;
  url?: string;
}

/**
 * Sign in with credentials
 * This is a client-side wrapper for NextAuth's signIn function with proper CSRF handling
 */
export async function signIn(options: SignInOptions): Promise<SignInResponse> {
  const { email, password, redirect = false, callbackUrl = '/role-redirect' } = options;
  
  try {
    console.log('[CSRF] Starting sign-in process with CSRF protection');
    
    // Step 1: Ensure we have a CSRF token
    await ensureCSRFToken();
    
    // Step 2: Use NextAuth's signIn function (it should handle CSRF automatically)
    console.log('[CSRF] Calling NextAuth signIn with credentials');
    const result = await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false, // Always false to handle redirection ourselves
      callbackUrl
    });
    
    console.log('[CSRF] NextAuth signIn result:', { 
      ok: result?.ok, 
      error: result?.error, 
      status: result?.status 
    });
    
    // Ensure we return a consistent response with proper types
    return {
      error: result?.error,
      status: result?.status,
      ok: result?.ok,
      url: result?.url || undefined
    };
  } catch (error) {
    console.error('Error during sign in:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown sign-in error',
      ok: false
    };
  }
}

/**
 * Ensure CSRF token is available before attempting authentication
 */
async function ensureCSRFToken(): Promise<void> {
  try {
    console.log('[CSRF] Ensuring CSRF token is available');
    
    // Check if we already have a CSRF cookie
    const hasCSRFCookie = document.cookie.includes('next-auth.csrf-token') || 
                         document.cookie.includes('__Host-next-auth.csrf-token');
    
    if (hasCSRFCookie) {
      console.log('[CSRF] CSRF token already exists in cookies');
      return;
    }
    
    console.log('[CSRF] No CSRF token found, fetching from server');
    
    // Fetch CSRF token from our endpoint
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[CSRF] Successfully fetched CSRF token:', { 
        success: data.success, 
        generated: data.generated 
      });
    } else {
      console.warn('[CSRF] Failed to fetch CSRF token, but continuing with sign-in');
    }
  } catch (error) {
    console.warn('[CSRF] Error ensuring CSRF token:', error);
    // Don't throw - let the sign-in attempt continue
  }
}

export interface SignOutOptions {
  callbackUrl?: string;
}

/**
 * Enhanced sign out function with fallback mechanisms
 * This is a client-side wrapper for NextAuth's signOut function
 * that includes fallbacks for when NextAuth signOut fails
 */
export async function signOut(options?: SignOutOptions) {
  const callbackUrl = options?.callbackUrl || '/';
  
  try {
    console.log('Attempting to sign out using NextAuth...');
    
    // Try the standard NextAuth signOut first
    const result = await nextAuthSignOut({
      redirect: false,
      callbackUrl
    });
    
    console.log('NextAuth signOut result:', result);
    
    // If successful, return the result
    if (result?.url) {
      console.log('NextAuth signOut successful, returning result');
      return result;
    }
    
    // If we get here, the signOut might not have fully succeeded
    // Try our fallback endpoint
    console.log('NextAuth signOut may not have fully succeeded, trying fallback...');
    await tryFallbackSignOut();
    
    // Return a synthetic result
    return {
      url: callbackUrl,
      ok: true
    };
  } catch (error) {
    console.error('Error during primary sign out:', error);
    
    // Try our fallback endpoint
    console.log('Error during primary sign out, trying fallback...');
    await tryFallbackSignOut();
    
    // Return a synthetic result rather than throwing
    return {
      url: callbackUrl,
      ok: true
    };
  }
}

/**
 * Fallback sign out mechanism that uses our custom endpoint
 * This is used when NextAuth's signOut fails
 */
async function tryFallbackSignOut() {
  try {
    console.log('Attempting fallback sign out...');
    
    // Call our custom signout endpoint
    const response = await fetch('/api/auth/signout-fix', {
      method: 'GET',
      credentials: 'include'
    });
    
    const result = await response.json();
    console.log('Fallback sign out result:', result);
    
    // Also try to clear cookies directly from client side as a last resort
    clearAuthCookies();
    
    return result;
  } catch (error) {
    console.error('Error during fallback sign out:', error);
    
    // Try to clear cookies directly as a last resort
    clearAuthCookies();
    
    return {
      success: false,
      error: 'Failed to sign out using fallback'
    };
  }
}

/**
 * Last resort method to clear auth cookies directly from client side
 * This is used when both NextAuth signOut and our custom endpoint fail
 */
function clearAuthCookies() {
  try {
    console.log('Attempting to clear auth cookies directly...');
    
    // Try to clear all cookies that might be related to authentication
    const cookies = document.cookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const [name] = cookie.trim().split('=');
      
      if (name.includes('next-auth') || 
          name.includes('session') || 
          name.includes('token') || 
          name.includes('csrf') ||
          name.includes('callback') ||
          name.includes('__Secure-') ||
          name.includes('__Host-')) {
        
        console.log(`Clearing cookie: ${name}`);
        
        // Clear the cookie by setting its expiration to the past
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        
        // Also try with different paths
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname};`;
      }
    }
    
    console.log('Finished clearing auth cookies directly');
  } catch (error) {
    console.error('Error clearing auth cookies directly:', error);
  }
}