import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Check if a user is an admin, redirecting to unauthorized page if not
 * 
 * Use this in admin-only server components/api routes to protect them
 */
export async function requireAdmin() {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/sign-in");
  }
  
  const isAdmin = 
    session.user.role === "ADMIN" || 
    session.user.role === "SUPER_ADMIN" || 
    session.user.isAdmin === true;
  
  if (!isAdmin) {
    redirect("/unauthorized");
  }
  
  return session;
}

/**
 * Check if a user is a super admin, redirecting to unauthorized page if not
 * 
 * Use this in super-admin-only server components/api routes
 */
export async function requireSuperAdmin() {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/sign-in");
  }
  
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  
  if (!isSuperAdmin) {
    redirect("/unauthorized");
  }
  
  return session;
}