'use client';

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