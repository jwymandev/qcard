# Localhost SSL Fix

This document explains the updated approach to handling SSL connections when working with localhost in the development environment.

## Problem

When the application is running in a development environment with HTTPS enabled (e.g., via a reverse proxy, mkcert, or similar tool), internal API requests were failing with the error:

```
Error: SSL routines:ssl3_get_record:wrong version number:../deps/openssl/openssl/ssl/record/ssl3_record.c:355
```

This occurs because:
1. The frontend may be served over HTTPS
2. Internal fetch requests try to use HTTPS for localhost
3. The development server is running with HTTP only on localhost
4. This protocol mismatch causes SSL handshake failures

## Solution

We've implemented a special case handling for localhost that works as follows:

1. For localhost connections:
   - Always use HTTP protocol regardless of the original request protocol
   - This avoids certificate validation issues in development
   - Directly construct URLs with `http://localhost:port` format

2. For all other connections (staging/production):
   - Continue to enforce HTTPS for security
   - Use the ensureHttps utility function for consistency

## Implementation Details

1. **Direct localhost handling in middleware.ts**:
   ```typescript
   const host = request.headers.get('host') || '';
   let studioCheckUrl;
   
   if (host.includes('localhost')) {
     // Force HTTP for localhost and specific port to avoid SSL errors
     studioCheckUrl = `http://${host}/api/studio/check-access`;
     console.log(`Making localhost HTTP request to: ${studioCheckUrl}`);
   } else {
     // For production/staging, use HTTPS
     const checkStudioUrl = new URL('/api/studio/check-access', request.url);
     studioCheckUrl = ensureHttps(checkStudioUrl, request);
     console.log(`Making secure request to: ${studioCheckUrl}`);
   }
   ```

2. **Enhanced subscription handling**:
   - Skip subscription checks for localhost in development mode
   - Use HTTP for all localhost API requests in the subscription middleware

3. **Authentication cookies**:
   - Continue to use secure cookies for all environments
   - This ensures production security while middleware handles localhost special cases

## Security Considerations

This approach maintains a good balance between development convenience and production security:

1. In development (localhost):
   - HTTP is used for internal API requests
   - This is acceptable because traffic never leaves your machine
   - Local development often doesn't have proper SSL certificates

2. In production/staging:
   - HTTPS is strictly enforced for all connections
   - Secure cookies are required for authentication
   - No exceptions are made for non-localhost environments

## Better Alternatives (Future Work)

For maximum security even in development, consider:

1. Setting up proper SSL certificates for localhost:
   - Use tools like mkcert to create locally-trusted certificates
   - Configure Next.js to serve HTTPS in development

2. Using a consistent HTTPS setup:
   - Configure the development server to use the same HTTPS certificates
   - Update the ensureHttps utility to handle localhost with HTTPS

## Testing the Fix

To verify that the SSL fix is working:

1. Visit the `/debug-ssl` page to check connection details
2. Check browser console for SSL-related errors
3. Monitor server logs for "Making localhost HTTP request" messages
4. Verify the client can navigate to previously problematic pages without errors