# SSL/HTTPS Security Configuration

This document outlines the implementation of SSL/HTTPS security in the application to ensure all connections are secure, especially in development environments with HTTPS enabled.

## Overview

We've implemented several changes to ensure that all internal and external connections use HTTPS when the application is running with SSL enabled. These changes help prevent "wrong version number" errors that occur when mixing HTTP and HTTPS protocols.

## Key Changes

### 1. Secure Cookie Configuration

All cookies are now configured to use the `secure` flag, which ensures they are only sent over HTTPS connections:

```typescript
// src/auth.ts
cookies: {
  sessionToken: {
    // ...
    options: {
      // ...
      secure: true, // Enforce HTTPS for session token
    },
  },
  // Similar changes for callbackUrl and csrfToken
}
```

### 2. URL Protocol Standardization

A utility function has been created to standardize URL protocols to HTTPS:

```typescript
// src/lib/utils.ts
export function ensureHttps(url: string | URL, request?: Request): string {
  // If it's a URL object, convert to string
  const urlString = url instanceof URL ? url.toString() : url;
  
  // If it's an absolute URL with http://, convert to https://
  if (urlString.startsWith('http://')) {
    return urlString.replace(/^http:\/\//i, 'https://');
  }
  
  // If it's a relative URL and we have a request object, use the request's base URL
  if (urlString.startsWith('/') && request) {
    const host = request.headers.get('host') || '';
    return `https://${host}${urlString}`;
  }
  
  // If it's already https:// or something else, return as is
  return urlString;
}
```

### 3. Internal API Requests

All internal API requests now use the `ensureHttps` utility function to enforce HTTPS:

```typescript
// Example from middleware.ts
const checkStudioUrl = new URL('/api/studio/check-access', request.url);
// Ensure the URL uses HTTPS
const secureUrl = ensureHttps(checkStudioUrl, request);
const checkResponse = await fetch(secureUrl, {
  headers: { cookie: request.headers.get('cookie') || '' },
});
```

### 4. SSL Debugging Tools

A diagnostic endpoint and page have been added to help debug SSL/HTTPS issues:

- `/api/debug-ssl` - API endpoint that returns detailed SSL connection information
- `/debug-ssl` - Browser page that shows SSL connection status and allows testing API endpoints

## Using the Debug Tools

When experiencing SSL-related issues, visit `/debug-ssl` in your browser to:

1. See if your connection is using HTTPS
2. View request headers related to security
3. Check environment configuration
4. Test API endpoints for SSL compatibility

## Common SSL Issues

### "wrong version number" Error

This usually occurs when:
- The client is making an HTTPS request to a server expecting HTTP
- The server is responding with HTTP when the client expects HTTPS
- There's a mismatch in SSL/TLS protocol versions

Our implementation resolves these issues by enforcing HTTPS consistently across:
- Cookie security settings
- Internal API requests
- Authentication flows
- Middleware operations

### Development vs Production

In development environments with HTTPS enabled:
- Ensure NextAuth is configured to use secure cookies
- Set `NEXTAUTH_URL` with `https://` protocol
- Use localhost SSL certificates correctly

## Testing SSL Configuration

To verify SSL is working correctly:

1. Visit `/debug-ssl` to check connection status
2. Check browser console for SSL-related errors
3. Verify all internal API requests use HTTPS protocol
4. Ensure cookies have the `secure` flag set

If issues persist, check:
- Certificate configuration
- Load balancer/proxy settings
- Environment variables related to URLs