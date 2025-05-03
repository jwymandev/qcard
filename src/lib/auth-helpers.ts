// Auth helper functions for consistent authentication handling

/**
 * Gets a CSRF token for authentication requests
 */
export async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch('/api/auth/csrf');
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Checks if the user is currently authenticated
 */
export async function checkAuthentication(): Promise<{ 
  authenticated: boolean;
  user?: any;
}> {
  try {
    const response = await fetch('/api/auth/check-session');
    if (!response.ok) {
      return { authenticated: false };
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { authenticated: false };
  }
}

/**
 * Gets the current server session without a client-side request
 * Note: This is useful for server components but not for client components
 */
export async function getServerSession() {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}