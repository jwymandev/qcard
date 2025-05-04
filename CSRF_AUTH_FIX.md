# CSRF Authentication Fix

This document explains the changes made to fix CSRF token errors in the NextAuth.js implementation.

## The Problem

The application was experiencing the following CSRF-related error:

```
[auth][error] MissingCSRF: CSRF token was missing during an action callback. 
Read more at https://errors.authjs.dev#missingcsrf
```

## Root Causes

1. NextAuth requires a CSRF token for authentication actions to prevent cross-site request forgery attacks
2. The sign-in and sign-up forms were not including the CSRF token when submitting credentials
3. The auth configuration didn't properly define CSRF cookie options

## Implemented Fixes

### 1. Updated NextAuth Configuration

Added proper CSRF token cookie configuration in `src/auth.ts`:

```typescript
cookies: {
  csrfToken: {
    name: "next-auth.csrf-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    },
  },
},
```

### 2. Created Helper Functions

Added a dedicated helper file (`src/lib/auth-helpers.ts`) with functions to:

- Get CSRF tokens: `getCsrfToken()`
- Check authentication status: `checkAuthentication()`
- Get server session: `getServerSession()`

### 3. Updated Sign-in Flow

Modified the sign-in process to:

1. Fetch a CSRF token before attempting to sign in
2. Include the token with sign-in credentials
3. Properly handle authentication errors

### 4. Updated Sign-up Flow

Similarly updated the sign-up process to:

1. Fetch a CSRF token before the auto-sign-in after registration
2. Include the token with sign-in credentials
3. Handle authentication flow properly

### 5. Added Session Check Endpoint

Created a new API endpoint (`/api/auth/check-session`) to verify authentication status and help with debugging.

## Testing the Fix

To verify the fix is working:

1. Try signing in with valid credentials
2. Check the browser's network tab to see successful CSRF token requests
3. Confirm that no CSRF errors appear in the console or server logs

## Additional Resources

- [NextAuth.js CSRF Protection Documentation](https://next-auth.js.org/configuration/options#secret)
- [Cross-Site Request Forgery (CSRF) in Next.js Applications](https://nextjs.org/docs/advanced-features/security/introduction)
- [Auth.js Error Documentation](https://errors.authjs.dev#missingcsrf)