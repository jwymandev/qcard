# Relative URL Fix for Multi-Environment Support

This document explains the fix for API requests in the middleware to ensure they work correctly in all environments (development, staging, and production).

## Problem

The application was attempting to make requests to a hardcoded `localhost:8080` URL even when running in a deployed environment (e.g., https://qcarddev.workflosoftware.com). This was causing SSL connection errors:

```
Error: SSL routines:ssl3_get_record:wrong version number:../deps/openssl/openssl/ssl/record/ssl3_record.c:355
```

Logs showed that middleware was making requests to:
```
Making secure request to: http://localhost:8080/api/studio/check-access
```

This is incorrect because:
1. A deployed application should never call localhost
2. It was mixing HTTP and HTTPS protocols
3. The port 8080 might not be relevant in the deployed environment

## Solution

We've modified the middleware to use **relative URLs** for all internal API requests:

1. Instead of constructing absolute URLs with domains, we now use relative paths like `/api/studio/check-access`
2. This ensures requests automatically go to the same domain the application is running on
3. The protocol (HTTP/HTTPS) is inherited from the current request

## Implementation Details

1. **Updated middleware.ts**:
   ```typescript
   // Always use relative URLs to the current host
   const apiPath = '/api/studio/check-access';
   
   // For API requests, always use a relative URL to ensure requests go to the same origin
   const checkResponse = await fetch(apiPath, {
     headers: { cookie: request.headers.get('cookie') || '' },
   });
   ```

2. **Updated middleware-subscription.ts**:
   ```typescript
   // Always use a relative URL for API requests to ensure same-origin requests
   const apiPath = '/api/user/subscription';
   
   // This will automatically use the same protocol and host as the current request
   const subscriptionCheck = await fetch(apiPath, {
     headers: {
       cookie: request.headers.get('cookie') || '',
     },
   });
   ```

3. **Removed environment-based conditionals**:
   - No more special handling based on hostname
   - No differences between localhost and production URLs
   - All environments use the same code path

## Benefits

This approach provides several key benefits:

1. **Environment agnostic**: Works identically in all environments without special configuration
2. **Same-origin requests**: Automatically uses the same protocol (HTTP/HTTPS) as the current page
3. **Simplicity**: Reduces complexity by eliminating special cases and hostname detection
4. **Security**: No more hardcoded domains or explicit protocol selection
5. **Maintainability**: Same code works everywhere, reducing potential deployment issues

## Testing

To verify the fix is working:

1. The application should no longer attempt to connect to localhost in a deployed environment
2. Internal API requests should go to the same domain as the application
3. No more "wrong version number" SSL errors should appear in the logs
4. The application should work correctly in all environments without protocol-related errors

## Additional Notes

If you need to access resources on a different domain or service, use absolute URLs only for those specific cases, and ensure proper CORS configuration is in place.