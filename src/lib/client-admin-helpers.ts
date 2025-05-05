'use client';

import { useSession } from 'next-auth/react';

/**
 * For client components, to check if the current user is an admin
 */
export function isUserAdmin(session: any) {
  if (!session || !session.user) return false;
  
  return (
    session.user.role === "ADMIN" || 
    session.user.role === "SUPER_ADMIN" || 
    session.user.isAdmin === true
  );
}

/**
 * For client components, to check if the current user is a super admin
 */
export function isUserSuperAdmin(session: any) {
  if (!session || !session.user) return false;
  
  return session.user.role === "SUPER_ADMIN";
}

/**
 * Custom hook to check if the current user is a super admin
 * This combines the session fetch and superadmin check
 */
export function useIsSuperAdmin() {
  const { data: session } = useSession();
  return isUserSuperAdmin(session);
}

/**
 * Custom hook to check if the current user is an admin
 * This combines the session fetch and admin check
 */
export function useIsAdmin() {
  const { data: session } = useSession();
  return isUserAdmin(session);
}