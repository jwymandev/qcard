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
 * This is a client-side wrapper for NextAuth's signIn function
 */
export async function signIn(options: SignInOptions): Promise<SignInResponse> {
  const { email, password, redirect = false, callbackUrl = '/role-redirect' } = options;
  
  try {
    // We need to explicitly cast redirect to false to match NextAuth typing
    const result = await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false, // Always false to handle redirection ourselves
      callbackUrl
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

export interface SignOutOptions {
  callbackUrl?: string;
}

/**
 * Sign out the current user
 * This is a client-side wrapper for NextAuth's signOut function
 */
export async function signOut(options?: SignOutOptions) {
  try {
    // Always use redirect: false to match NextAuth typing
    return await nextAuthSignOut({
      redirect: false,
      callbackUrl: options?.callbackUrl
    });
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
}