'use client';

import { useRouter } from 'next/navigation';

/**
 * Client-side navigation utilities for authenticated routes
 * These help handle routing issues that can occur after authentication
 */

/**
 * Navigate to a path with the option to force a full page refresh
 * This helps when client-side navigation breaks after authentication
 */
export function navigateTo(path: string, options: { forceRefresh?: boolean } = {}) {
  const { forceRefresh = false } = options;
  
  if (forceRefresh) {
    // Force a full page refresh by using window.location
    window.location.href = path;
    return;
  }
  
  // Use client-side navigation if not forcing refresh
  try {
    const router = useRouter();
    router.push(path);
  } catch (error) {
    console.error(`Navigation error to ${path}:`, error);
    // Fall back to window.location if router fails
    window.location.href = path;
  }
}

/**
 * Navigate based on user role/tenant type
 * Used to route users to the correct dashboard after authentication
 */
export function navigateByRole(user: any, options: { forceRefresh?: boolean } = {}) {
  if (!user) {
    navigateTo('/sign-in', options);
    return;
  }
  
  if (user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.tenantType === 'ADMIN') {
    navigateTo('/admin/dashboard', options);
  } else if (user.tenantType === 'STUDIO') {
    navigateTo('/studio/dashboard', options);
  } else {
    navigateTo('/talent/dashboard', options);
  }
}

/**
 * A hook to determine if we should force page refreshes for navigation
 * This helps with authentication state issues in Next.js
 */
export function useForceRefreshStrategy() {
  // Default to using force refresh in production for reliability
  // This ensures authentication state is always fresh
  const shouldForceRefresh = process.env.NODE_ENV === 'production';
  
  return {
    shouldForceRefresh,
    navigateTo: (path: string) => navigateTo(path, { forceRefresh: shouldForceRefresh }),
    navigateByRole: (user: any) => navigateByRole(user, { forceRefresh: shouldForceRefresh }),
  };
}